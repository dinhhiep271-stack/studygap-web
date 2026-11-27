import type { BilingualText } from "@/lib/curriculum";
import { defaultLocale, type Locale } from "@/lib/locales";

/**
 * Shared contract of the AI concept explainer (`POST /explain-concept`).
 *
 * The FastAPI service answers bilingually: each of the four sections is an
 * object `{ de, vi }` holding the same content in German and Vietnamese. The
 * JSON keys stay German (`definition`, `erklaerung`, `zusammenhang`, `kritik`);
 * only the values carry both languages. The UI captions live in the dictionary
 * (`dict.concept`) so the dialog can be localised without touching this
 * contract.
 */

/** Section keys of the concept explanation, in display order. */
export const conceptSectionKeys = [
  "definition",
  "erklaerung",
  "zusammenhang",
  "kritik",
] as const;

export type ConceptSectionKey = (typeof conceptSectionKeys)[number];

/**
 * Native captions of the four sections. They label the language blocks, so they
 * are fixed per language instead of coming from the active UI dictionary.
 */
export const conceptSectionNames: Record<
  Locale,
  Record<ConceptSectionKey, string>
> = {
  de: {
    definition: "Definition",
    erklaerung: "Erklärung",
    zusammenhang: "Zusammenhang",
    kritik: "Kritik",
  },
  vi: {
    definition: "Định nghĩa",
    erklaerung: "Giải thích",
    zusammenhang: "Liên hệ",
    kritik: "Phản biện",
  },
};

/** The four parts of one AI explanation, each in both course languages. */
export type ConceptExplanation = {
  concept: string;
  definition: BilingualText;
  erklaerung: BilingualText;
  zusammenhang: BilingualText;
  kritik: BilingualText;
};

/**
 * Error codes of `POST /api/concepts`. They mirror the exam error codes so the
 * client can pick a friendly message from the dictionary.
 */
export const conceptErrorCodes = [
  "network",
  "timeout",
  "upstream",
  "empty",
  "missing-concept",
  "invalid-body",
  "invalid-json",
  "unauthorized",
  "unknown",
] as const;

export type ConceptErrorCode = (typeof conceptErrorCodes)[number];

export function isConceptErrorCode(
  value: unknown,
): value is ConceptErrorCode {
  return (
    typeof value === "string" &&
    (conceptErrorCodes as readonly string[]).includes(value)
  );
}

/** Captions of the clickable concept cards and their explanation dialog. */
export type ConceptLabels = {
  /** Action hint on a concept card (also used as accessible name). */
  action: string;
  dialogEyebrow: string;
  /** Note that the answer is rendered in German and Vietnamese. */
  bilingualHint: string;
  loading: string;
  loadingHint: string;
  errorTitle: string;
  /** One friendly message per code returned by `/api/concepts`. */
  errors: Record<ConceptErrorCode, string>;
  retry: string;
  close: string;
  emptySection: string;
  disclaimer: string;
  sections: Record<ConceptSectionKey, string>;
};

function readText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  // A model can answer a section with a list or an object instead of one
  // string; flatten it instead of dropping the content.
  if (Array.isArray(value)) {
    return value.map(readText).filter(Boolean).join("\n");
  }

  if (typeof value === "object" && value !== null) {
    return Object.values(value).map(readText).filter(Boolean).join("\n");
  }

  return "";
}

function emptyText(): BilingualText {
  return { de: "", vi: "" };
}

/**
 * Reads one section. Current responses are `{ de, vi }`; older ones returned a
 * single string in the requested language. That string lands in the matching
 * slot, so the dialog still shows it without inventing a translation.
 */
function readLocalizedText(
  value: unknown,
  fallbackLocale: Locale,
): BilingualText {
  if (Array.isArray(value) || typeof value === "string") {
    const text = readText(value);
    return fallbackLocale === "de"
      ? { de: text, vi: "" }
      : { de: "", vi: text };
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const de = readText(record.de) || readText(record.german);
    const vi = readText(record.vi) || readText(record.vietnamese);

    if (de || vi) {
      return { de, vi };
    }

    // Legacy object without language keys: flatten it into the fallback slot.
    const text = readText(value);
    return fallbackLocale === "de"
      ? { de: text, vi: "" }
      : { de: "", vi: text };
  }

  return emptyText();
}

function hasLocalizedText(value: BilingualText) {
  return Boolean(value.de || value.vi);
}

/**
 * Reads an `/explain-concept` payload defensively and returns `null` when the
 * model delivered neither a definition nor an explanation (the AI service
 * rejects that case as well).
 */
export function parseConceptExplanation(
  value: unknown,
  fallbackConcept = "",
  fallbackLocale: Locale = defaultLocale,
): ConceptExplanation | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const explanation: ConceptExplanation = {
    concept: readText(record.concept) || fallbackConcept,
    definition: readLocalizedText(record.definition, fallbackLocale),
    erklaerung: readLocalizedText(record.erklaerung, fallbackLocale),
    zusammenhang: readLocalizedText(record.zusammenhang, fallbackLocale),
    kritik: readLocalizedText(record.kritik, fallbackLocale),
  };

  return hasLocalizedText(explanation.definition) ||
    hasLocalizedText(explanation.erklaerung)
    ? explanation
    : null;
}
