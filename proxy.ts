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

/** Sends unauthenticated visitors to `/login`, keeping their destination. */
function loginRedirect(
  request: NextRequest,
  locale: Locale,
  nextPath: string,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = new URLSearchParams({ next: nextPath, lang: locale }).toString();

  return NextResponse.redirect(url);
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

  if (pathname === "/login") {
    // Language pills on the login page link to `/login?lang=de|vi`; remember the
    // choice in the same cookie the locale redirect uses, so the app opens in
    // that language after signing in. The page itself reads `?lang=` directly.
    const requestedLocale = request.nextUrl.searchParams.get("lang");
    const storedLocale = request.cookies.get(localeCookie)?.value;
    const selectedLocale =
      requestedLocale &&
      hasLocale(requestedLocale) &&
      requestedLocale !== storedLocale
        ? requestedLocale
        : null;

    // Already signed in: skip the form and continue to the original target.
    if (sessionValid) {
      const destination = request.nextUrl.searchParams.get("next") ?? undefined;
      const target = new URL(
        safeRedirectPath(destination),
        request.nextUrl.origin,
      );
      const url = request.nextUrl.clone();
      url.pathname = target.pathname;
      url.search = target.search;
      const response = NextResponse.redirect(url);
      return selectedLocale ? rememberLocale(response, selectedLocale) : response;
    }

    const response = NextResponse.next();
    return selectedLocale ? rememberLocale(response, selectedLocale) : response;
  }

  const firstSegment = pathname.split("/")[1] ?? "";

  if (!sessionValid) {
    const locale = hasLocale(firstSegment)
      ? firstSegment
      : getPreferredLocale(request);
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
  const locale = getPreferredLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next|.*\\.(?:ico|png|jpe?g|gif|svg|webp|txt|xml|json|css|js|map|woff2?|ttf|otf)$).*)",
  ],
};
