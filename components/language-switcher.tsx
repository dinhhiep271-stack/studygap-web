"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/lib/locales";

export type LanguageSwitcherProps = {
  lang: Locale;
  label: string;
  toGerman: string;
  toVietnamese: string;
};

type LanguageSwitcherNavProps = LanguageSwitcherProps & {
  hrefFor: (code: Locale) => string;
};

function LanguageSwitcherNav({
  lang,
  label,
  toGerman,
  toVietnamese,
  hrefFor,
}: LanguageSwitcherNavProps) {
  const ariaLabels: Record<Locale, string> = {
    de: toGerman,
    vi: toVietnamese,
  };

  return (
    <nav
      aria-label={label}
      className="flex shrink-0 items-center rounded-full border border-zinc-200 bg-zinc-100 p-0.5"
    >
      {locales.map((code) => {
        const isActive = code === lang;

        return (
          <Link
            key={code}
            href={hrefFor(code)}
            hrefLang={code}
            aria-label={ariaLabels[code]}
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
  );
}

/**
 * `usePathname()` is URL data, so Cache Components requires a `<Suspense>`
 * boundary. Render `LanguageSwitcherFallback` as the fallback: it shows the same
 * markup without the hook.
 */
export function LanguageSwitcher(props: LanguageSwitcherProps) {
  const pathname = usePathname();
  const prefix = `/${props.lang}`;
  const rest = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : "";

  return (
    <LanguageSwitcherNav
      {...props}
      hrefFor={(code) => (rest ? `/${code}${rest}` : `/${code}`)}
    />
  );
}

/** Streams in place of `LanguageSwitcher` while the pathname is unknown. */
export function LanguageSwitcherFallback(props: LanguageSwitcherProps) {
  return <LanguageSwitcherNav {...props} hrefFor={(code) => `/${code}`} />;
}
