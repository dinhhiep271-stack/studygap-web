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
  const sessionValid = await isSessionValid(
    request.cookies.get(sessionCookie)?.value,
  );

  // API routes are protected as well; the auth endpoints themselves stay open.
  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/auth/")) {
      return NextResponse.next();
    }

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
