import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { getDictionary } from "@/lib/i18n";
import {
  defaultLocale,
  hasLocale,
  locales,
  type Locale,
} from "@/lib/locales";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "404 · Studygap",
  description: "The requested page could not be found.",
};

// The global 404 needs request data (the locale header) to render its document
// language, so this route intentionally opts out of the static shell.
export const instant = false;

function NotFoundContent({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);

  return (
    <>
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-6">
          <Link href={`/${locale}`} className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-base font-bold text-white">
              S
            </span>
            <span className="text-lg font-semibold tracking-tight">
              Studygap
            </span>
          </Link>

          <nav
            aria-label={dict.nav.language}
            className="flex items-center rounded-full border border-zinc-200 bg-zinc-100 p-0.5"
          >
            {locales.map((code) => (
              <Link
                key={code}
                href={`/${code}`}
                hrefLang={code}
                aria-current={code === locale ? "true" : undefined}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase transition-colors ${
                  code === locale
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {code}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-sm font-semibold text-emerald-700">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
          {dict.notFound.title}
        </h1>
        <p className="mt-3 max-w-md text-base leading-7 text-zinc-600">
          {dict.notFound.description}
        </p>
        <Link
          href={`/${locale}`}
          className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-emerald-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          {dict.notFound.home}
        </Link>
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto w-full max-w-5xl px-6 py-6 text-sm text-zinc-500">
          {dict.footer}
        </div>
      </footer>
    </>
  );
}

export default async function GlobalNotFound() {
  const requestHeaders = await headers();
  const headerLocale = requestHeaders.get("x-studygap-locale");
  const locale =
    headerLocale && hasLocale(headerLocale) ? headerLocale : defaultLocale;

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
        <NotFoundContent locale={locale} />
      </body>
    </html>
  );
}
