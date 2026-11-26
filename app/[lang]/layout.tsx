import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import {
  LanguageSwitcher,
  LanguageSwitcherFallback,
  type LanguageSwitcherProps,
} from "@/components/language-switcher";
import { LogoutButton } from "@/components/logout-button";
import { getDictionary } from "@/lib/i18n";
import { defaultLocale, hasLocale, localeDirection, locales } from "@/lib/locales";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type RootLayoutProps = {
  children: ReactNode;
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

/**
 * The switcher reads `usePathname()` (URL data), so it needs a Suspense
 * boundary to keep the App Shell shared between routes.
 */
function LanguageSwitcherBoundary(props: LanguageSwitcherProps) {
  return (
    <Suspense fallback={<LanguageSwitcherFallback {...props} />}>
      <LanguageSwitcher {...props} />
    </Suspense>
  );
}

export async function generateMetadata({
  params,
}: Pick<RootLayoutProps, "params">): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(hasLocale(lang) ? lang : defaultLocale);

  return {
    title: {
      default: dict.meta.defaultTitle,
      template: dict.meta.template,
    },
    description: dict.meta.description,
  };
}

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dict = getDictionary(lang);

  return (
    <html
      lang={lang}
      dir={localeDirection(lang)}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/85 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
            <Link
              href={`/${lang}`}
              className="flex min-w-0 items-center gap-2.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-base font-bold text-white">
                S
              </span>
              <span className="hidden text-lg font-semibold tracking-tight sm:inline">
                Studygap
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <nav
                aria-label={dict.nav.mainLabel}
                className="flex items-center gap-0.5 text-xs font-medium text-zinc-600 sm:gap-1 sm:text-sm"
              >
                <Link
                  href={`/${lang}`}
                  className="rounded-full px-2 py-2 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:px-3"
                >
                  {dict.nav.subjects}
                </Link>
                <Link
                  href={`/${lang}/upload`}
                  className="rounded-full px-2 py-2 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:px-3"
                >
                  {dict.nav.upload}
                </Link>
              </nav>

              <LanguageSwitcherBoundary
                lang={lang}
                label={dict.nav.language}
                toGerman={dict.nav.toGerman}
                toVietnamese={dict.nav.toVietnamese}
              />

              <LogoutButton
                label={dict.nav.logout}
                pendingLabel={dict.nav.loggingOut}
              />
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col">{children}</main>

        <footer className="border-t border-zinc-200 bg-white">
          <div className="mx-auto w-full max-w-5xl px-6 py-6 text-sm text-zinc-500">
            {dict.footer}
          </div>
        </footer>
      </body>
    </html>
  );
}
