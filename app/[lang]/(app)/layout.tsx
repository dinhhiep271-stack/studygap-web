import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import {
  LanguageSwitcher,
  LanguageSwitcherFallback,
  type LanguageSwitcherProps,
} from "@/components/language-switcher";
import { LogoutButton } from "@/components/logout-button";
import { getDictionary } from "@/lib/i18n";
import { defaultLocale, hasLocale } from "@/lib/locales";

type AppLayoutProps = {
  children: ReactNode;
  params: Promise<{ lang: string }>;
};

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

/**
 * Shell of the private app (header, navigation, language switcher, logout
 * button and footer). The document itself comes from `app/[lang]/layout.tsx`,
 * so navigating between this group and `(auth)` is a soft navigation and the
 * login page does not render the app chrome.
 */
export default async function AppLayout({ children, params }: AppLayoutProps) {
  const { lang } = await params;
  // The root layout already returns the 404 for unsupported locales; this
  // fallback only keeps the header typed if a new locale is added in between.
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const dict = getDictionary(locale);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
          <Link
            href={`/${locale}`}
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
                href={`/${locale}`}
                className="rounded-full px-2 py-2 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:px-3"
              >
                {dict.nav.subjects}
              </Link>
              <Link
                href={`/${locale}/upload`}
                className="rounded-full px-2 py-2 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:px-3"
              >
                {dict.nav.upload}
              </Link>
            </nav>

            <LanguageSwitcherBoundary
              lang={locale}
              label={dict.nav.language}
              toGerman={dict.nav.toGerman}
              toVietnamese={dict.nav.toVietnamese}
            />

            <LogoutButton
              lang={locale}
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
    </>
  );
}
