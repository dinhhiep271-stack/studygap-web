import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { safeRedirectPath } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import {
  defaultLocale,
  hasLocale,
  localeCookie,
  localeNames,
  locales,
  type Locale,
} from "@/lib/locales";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ lang?: string | string[]; next?: string | string[] }>;
};

export const metadata: Metadata = { title: "Login" };

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16"
    >
      <div className="h-80 animate-pulse rounded-3xl border border-zinc-200 bg-white" />
    </main>
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Keeps the requested destination while switching the login language. */
function languageHref(lang: Locale, next: string): string {
  const params = new URLSearchParams({ lang });

  if (next !== "/") {
    params.set("next", next);
  }

  return `/login?${params.toString()}`;
}

/**
 * Cache Components: `searchParams` and the locale cookie are request data, so
 * they are read behind the Suspense boundary above (same pattern as the upload
 * page).
 */
async function LoginContent({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requested = firstValue(params.lang);
  const stored = (await cookies()).get(localeCookie)?.value;
  const lang: Locale =
    requested && hasLocale(requested)
      ? requested
      : stored && hasLocale(stored)
        ? stored
        : defaultLocale;
  const login = getDictionary(lang).login;
  const next = safeRedirectPath(params.next);

  return (
    <main
      lang={lang}
      className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16"
    >
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
          next={next}
          labels={{
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
    </main>
  );
}
