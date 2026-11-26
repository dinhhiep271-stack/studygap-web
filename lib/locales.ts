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
 * Languages written right-to-left. Everything else — including both supported
 * locales (`de`, `vi`) — renders left-to-right, so `<html dir>` is always
 * explicit and the layout can never inherit an RTL direction from the browser,
 * an extension, auto-translation or a stale document.
 */
const rightToLeftLanguages = ["ar", "fa", "he", "ur"] as const;

/** `"rtl"` only for Hebrew/Arabic/Persian/Urdu, `"ltr"` for everything else. */
export function localeDirection(locale: string): "ltr" | "rtl" {
  const language = locale.toLowerCase().split("-")[0];

  return (rightToLeftLanguages as readonly string[]).includes(language)
    ? "rtl"
    : "ltr";
}

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function otherLocale(locale: Locale): Locale {
  return locale === "de" ? "vi" : "de";
}
