export const locales = ["de", "vi"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "vi";

/** Cookie used by the proxy to remember the last selected language. */
export const localeCookie = "studygap-lang";

export const localeNames: Record<Locale, string> = {
  de: "Deutsch",
  vi: "Tiếng Việt",
};

/**
 * Writing direction of every supported locale. Both languages are
 * left-to-right, but the direction is declared explicitly and rendered on
 * `<html dir>` so the layout never inherits an RTL direction from the browser,
 * an extension or a stale document.
 */
export const localeDirections: Record<Locale, "ltr" | "rtl"> = {
  de: "ltr",
  vi: "ltr",
};

export function localeDirection(locale: Locale): "ltr" | "rtl" {
  return localeDirections[locale] ?? "ltr";
}

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function otherLocale(locale: Locale): Locale {
  return locale === "de" ? "vi" : "de";
}
