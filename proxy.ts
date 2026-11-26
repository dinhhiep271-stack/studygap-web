import { NextResponse, type NextRequest } from "next/server";
import {
  isSessionValid,
  safeRedirectPath,
  sessionCookie,
} from "@/lib/auth";
import {
  defaultLocale,
  hasLocale,
  localeCookie,
  type Locale,
} from "@/lib/locales";
import { getSubject } from "@/lib/subjects";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/**
 * Cookie Auth.js ghi sau khi đăng nhập Google: tên không có tiền tố khi chạy
 * qua HTTP (localhost) và có tiền tố `__Secure-` khi chạy qua HTTPS.
 */
const authjsSessionCookies = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const;

/**
 * Kiểm tra phiên đăng nhập Google do Auth.js (xem `auth.ts`) tạo ra.
 *
 * Auth.js dùng session strategy "database", nên cookie chỉ chứa một token
 * ngẫu nhiên – không thể xác thực bằng chữ ký như cookie `studygap-session`.
 * Token được tra trong bảng `Session` (unique index `sessionToken`) và phải
 * còn hạn, nhờ vậy không ai vào được app chỉ bằng cách tự đặt một cookie tên
 * `authjs.session-token`. Proxy chạy trên Node.js runtime nên dùng Prisma được.
 *
 * Không có cookie → trả về `false` mà không chạm database, nên người dùng đăng
 * nhập bằng form cũ không phải chịu thêm query nào.
 */
async function hasAuthjsSession(request: NextRequest): Promise<boolean> {
  const token = authjsSessionCookies
    .map((name) => request.cookies.get(name)?.value)
    .find(Boolean);

  if (!token) {
    return false;
  }

  try {
    // Nạp Prisma theo nhu cầu để proxy vẫn hoạt động khi biến môi trường
    // DATABASE_URL chưa được cấu hình (chỉ người dùng Google bị ảnh hưởng).
    const { prisma } = await import("@/lib/prisma");
    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      select: { expires: true },
    });

    return session !== null && session.expires.getTime() > Date.now();
  } catch (error) {
    // Lỗi database không được biến thành "đã đăng nhập": đóng cửa (fail closed).
    console.error("Could not verify the Auth.js session.", error);

    return false;
  }
}

function getPreferredLocale(request: NextRequest): Locale {
  const stored = request.cookies.get(localeCookie)?.value;
  return stored && hasLocale(stored) ? stored : defaultLocale;
}

function rememberLocale(response: NextResponse, locale: Locale): NextResponse {
  response.cookies.set(localeCookie, locale, {
    path: "/",
    maxAge: ONE_YEAR_IN_SECONDS,
    sameSite: "lax",
  });

  return response;
}

/** Sends unauthenticated visitors to the login page of their language. */
function loginRedirect(
  request: NextRequest,
  locale: Locale,
  nextPath: string,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}/login`;
  url.search = new URLSearchParams({ next: nextPath }).toString();

  return NextResponse.redirect(url);
}

/**
 * Post-login destination. A missing or unsafe `?next=` falls back to the home
 * page of the locale in the URL, so the user keeps their language.
 */
function postLoginDestination(request: NextRequest, locale: Locale): string {
  const next = safeRedirectPath(
    request.nextUrl.searchParams.get("next") ?? undefined,
  );

  return next === "/" ? `/${locale}` : next;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // The Auth.js endpoints must stay open while signed out – they are the ones
  // that create the session – so they skip the (database backed) check.
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Người dùng đăng nhập bằng form cũ (cookie ký HMAC) hoặc bằng Google
  // (cookie phiên của Auth.js) đều được coi là hợp lệ.
  const [legacySessionValid, authjsSessionValid] = await Promise.all([
    isSessionValid(request.cookies.get(sessionCookie)?.value),
    hasAuthjsSession(request),
  ]);
  const sessionValid = legacySessionValid || authjsSessionValid;

  // API routes are protected as well.
  if (pathname.startsWith("/api/")) {
    return sessionValid
      ? NextResponse.next()
      : NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0] ?? "";
  const locale: Locale = hasLocale(firstSegment)
    ? firstSegment
    : getPreferredLocale(request);

  // `/de/login` and `/vi/login` are the only public pages.
  const isLoginPage =
    hasLocale(firstSegment) && segments.length === 2 && segments[1] === "login";

  // Old bookmarks and the previous `?lang=` language pills point at the
  // unprefixed `/login`; forward them to the localized login page instead of
  // redirecting to the app (which would bounce back to the form).
  if (
    !hasLocale(firstSegment) &&
    segments.length === 1 &&
    segments[0] === "login"
  ) {
    const requested = request.nextUrl.searchParams.get("lang");
    const target = requested && hasLocale(requested) ? requested : locale;
    const next = request.nextUrl.searchParams.get("next");
    const url = request.nextUrl.clone();
    url.pathname = `/${target}/login`;
    url.search = next ? new URLSearchParams({ next }).toString() : "";

    return NextResponse.redirect(url);
  }

  if (isLoginPage && hasLocale(firstSegment)) {
    if (sessionValid) {
      // Already signed in: skip the form and continue to the original target.
      // `safeRedirectPath` rejects login paths, so this cannot loop.
      const url = request.nextUrl.clone();
      const target = new URL(
        postLoginDestination(request, firstSegment),
        request.nextUrl.origin,
      );
      url.pathname = target.pathname;
      url.search = target.search;

      return rememberLocale(NextResponse.redirect(url), firstSegment);
    }

    // Public page: only remember the language the visitor is looking at.
    return rememberLocale(NextResponse.next(), firstSegment);
  }

  if (!sessionValid) {
    const nextPath = hasLocale(firstSegment)
      ? `${pathname}${search}`
      : `/${locale}${pathname === "/" ? "" : pathname}${search}`;

    return loginRedirect(request, locale, nextPath);
  }

  // Already localized: keep the URL and remember the language for next visits.
  if (hasLocale(firstSegment)) {
    // The header lets global-not-found render in the right language server-side.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-studygap-locale", firstSegment);

    // Cache Components sends the shell before a page-level notFound() runs, so
    // unknown subject slugs are routed to the global 404 to keep a 404 status.
    const [, , section, id] = pathname.split("/");
    const hasUnknownSubject =
      section === "subject" && Boolean(id) && !getSubject(id);

    let response;
    if (hasUnknownSubject) {
      const notFoundUrl = request.nextUrl.clone();
      notFoundUrl.pathname = `/${firstSegment}/__not-found__`;
      notFoundUrl.search = "";
      response = NextResponse.rewrite(notFoundUrl, {
        request: { headers: requestHeaders },
      });
    } else {
      response = NextResponse.next({
        request: { headers: requestHeaders },
      });
    }

    return rememberLocale(response, firstSegment);
  }

  // Redirect unprefixed paths (including "/") to the preferred language.
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next|.*\\.(?:ico|png|jpe?g|gif|svg|webp|txt|xml|json|css|js|map|woff2?|ttf|otf)$).*)",
  ],
};
