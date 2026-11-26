import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { safeRedirectPath } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import {
  defaultLocale,
  hasLocale,
  localeNames,
  locales,
  type Locale,
} from "@/lib/locales";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
};

export async function generateMetadata({
  params,
}: Pick<LoginPageProps, "params">): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;

  return { title: getDictionary(locale).login.metaTitle };
}

export default function LoginPage({ params, searchParams }: LoginPageProps) {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <div
      aria-busy="true"
      className="h-80 animate-pulse rounded-3xl border border-zinc-200 bg-white"
    />
  );
}

/**
 * Swaps the locale prefix of a validated `next` path, so switching the login
 * language also switches the page the user lands on after signing in.
 */
function withLocale(path: string, locale: Locale): string {
  const match = /^([^?#]*)([?#].*)?$/.exec(path);
  const pathname = match?.[1] ?? path;
  const suffix = match?.[2] ?? "";
  const segments = pathname.split("/");

  if (hasLocale(segments[1] ?? "")) {
    segments[1] = locale;
  }

  return `${segments.join("/")}${suffix}`;
}

/** Login URL of another language that keeps the requested destination. */
function languageHref(locale: Locale, next: string): string {
  const href = `/${locale}/login`;

  return next === "/"
    ? href
    : `${href}?next=${encodeURIComponent(withLocale(next, locale))}`;
}

/**
 * Cache Components: `searchParams` is request data, so it is read behind the
 * Suspense boundary above (same pattern as the upload page). The locale comes
 * from the URL segment, not from a cookie or `?lang=`.
 */
async function LoginContent({ params, searchParams }: LoginPageProps) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { next: requestedNext } = await searchParams;
  const next = safeRedirectPath(requestedNext);
  // `/` means "no usable destination", so fall back to the locale home page.
  const destination = next === "/" ? `/${lang}` : next;
  const login = getDictionary(lang).login;

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-base font-bold text-white">
          S
        </span>
        <span className="text-lg font-semibold tracking-tight">Studygap</span>
      </div>

      <h1 className="mt-8 text-2xl font-semibold tracking-tight text-zinc-900">
        {login.title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{login.intro}</p>

      <LoginForm
        next={destination}
        labels={{
          google: login.google,
          googleRedirecting: login.googleRedirecting,
          username: login.usernameLabel,
          password: login.passwordLabel,
          submit: login.submit,
          submitting: login.submitting,
          invalid: login.invalidCredentials,
          missing: login.missingFields,
          network: login.networkError,
        }}
      />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4">
        <p className="text-xs text-zinc-500">{login.sessionHint}</p>

        <nav
          aria-label={login.language}
          className="flex shrink-0 items-center rounded-full border border-zinc-200 bg-zinc-100 p-0.5"
        >
          {locales.map((code) => {
            const isActive = code === lang;

            return (
              <Link
                key={code}
                href={languageHref(code, next)}
                hrefLang={code}
                aria-label={localeNames[code]}
                aria-current={isActive ? "true" : undefined}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase transition-colors ${
                  isActive
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {code}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
