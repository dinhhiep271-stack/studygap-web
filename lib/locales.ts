export const locales = ["de", "vi"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "vi";

/** Cookie used by the proxy to remember the last selected language. */
export const localeCookie = "studygap-lang";

export const localeNames: Record<Locale, string> = {
  de: "Deutsch",
  vi: "Tiếng Việt",
};

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function otherLocale(locale: Locale): Locale {
  return locale === "de" ? "vi" : "de";
}
