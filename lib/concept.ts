import type { BilingualText } from "@/lib/curriculum";
import { defaultLocale, type Locale } from "@/lib/locales";

/**
 * Shared contract of the AI concept explainer (`POST /explain-concept`).
 *
 * The FastAPI service answers bilingually: each section is an object
 * `{ de, vi }` holding the same content in German and Vietnamese. Which keys a
 * response carries depends on the `category` sent with the request: general
 * subjects answer with `definition`, `erklaerung`, `zusammenhang` and `kritik`,
 * medical subjects answer with `definition`, `symptome`, `diagnostik`,
 * `differentialdiagnosen`, `therapie`, `medikamente`, `prophylaxe`,
 * `pflegeplanung`, `komplikationen` and `prognose`. The dialog therefore renders
 * every key it receives
 * (`conceptSectionTitle` maps it to a bilingual caption) instead of hardcoding
 * four sections.
 */

/** Content structure the AI service is asked for (`category` request field). */
export const conceptCategories = ["general", "medical"] as const;

export type ConceptCategory = (typeof conceptCategories)[number];

export function isConceptCategory(
  value: unknown,
): value is ConceptCategory {
  return (
    typeof value === "string" &&
    (conceptCategories as readonly string[]).includes(value)
  );
}

/**
 * Subject-name keywords that mark a medical subject. The comparison
 * lower-cases the name and expands German umlauts, so "Medizin",
 * "medizinische" and "MEDIZIN" all match.
 */
export const medicalSubjectKeywords = [
  "medizin",
  "pflege",
  "krankheit",
] as const;

function foldSectionKey(value: string) {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

/**
 * Category for `POST /explain-concept`, derived from the subject name: a name
 * that contains one of `medicalSubjectKeywords` makes the subject `medical`,
 * everything else stays `general`.
 */
export function conceptCategoryForSubject(
  subjectName: string | readonly string[],
): ConceptCategory {
  const names = typeof subjectName === "string" ? [subjectName] : subjectName;

  return names.some((name) => {
    const folded = foldSectionKey(name);

    return medicalSubjectKeywords.some((keyword) => folded.includes(keyword));
  })
    ? "medical"
    : "general";
}

/**
 * Titles of the known section keys, in both languages. Keys are stored in their
 * folded form (umlauts expanded, punctuation removed) so `erklaerung` and
 * `Erklärung` resolve to the same entry.
 */
export const conceptSectionTitles: Record<string, BilingualText> = {
  // General structure.
  definition: { de: "Definition", vi: "Định nghĩa" },
  erklaerung: { de: "Erklärung", vi: "Giải thích" },
  zusammenhang: { de: "Zusammenhang", vi: "Liên hệ" },
  kritik: { de: "Kritik", vi: "Phản biện" },
  // Medical structure: mirrors MEDICAL_CONCEPT_SYSTEM_PROMPT in studygap-ai so
  // every section of `category=medical` has a German/Vietnamese caption.
  symptome: { de: "Symptome", vi: "Triệu chứng" },
  diagnostik: { de: "Diagnostik", vi: "Chẩn đoán" },
  differentialdiagnosen: {
    de: "Differentialdiagnosen",
    vi: "Chẩn đoán phân biệt",
  },
  therapie: { de: "Therapie", vi: "Điều trị" },
  medikamente: { de: "Medikamente", vi: "Thuốc" },
  prophylaxe: { de: "Prophylaxe", vi: "Dự phòng" },
  pflegeplanung: { de: "Pflegeplanung", vi: "Kế hoạch chăm sóc" },
  komplikationen: { de: "Komplikationen", vi: "Biến chứng" },
  prognose: { de: "Prognose", vi: "Tiên lượng" },
  // Further medical keys the model may answer with (aliases / older prompts).
  ursachen: { de: "Ursachen", vi: "Nguyên nhân" },
  aetiologie: { de: "Ätiologie", vi: "Căn nguyên" },
  risikofaktoren: { de: "Risikofaktoren", vi: "Yếu tố nguy cơ" },
  pathophysiologie: { de: "Pathophysiologie", vi: "Sinh lý bệnh" },
  diagnose: { de: "Diagnose", vi: "Chẩn đoán" },
  klinik: { de: "Klinik", vi: "Biểu hiện lâm sàng" },
  untersuchung: { de: "Untersuchung", vi: "Thăm khám" },
  behandlung: { de: "Behandlung", vi: "Điều trị" },
  pflege: { de: "Pflege", vi: "Chăm sóc" },
  praevention: { de: "Prävention", vi: "Phòng ngừa" },
  anatomie: { de: "Anatomie", vi: "Giải phẫu" },
  physiologie: { de: "Physiologie", vi: "Sinh lý" },
  nebenwirkungen: { de: "Nebenwirkungen", vi: "Tác dụng phụ" },
};

function normalizeSectionKey(key: string) {
  return foldSectionKey(key).replace(/[\s_-]+/g, "");
}

/** `nebenwirkungen` → `Nebenwirkungen`, `sozial_geschichte` → `Sozial geschichte`. */
function humanizeSectionKey(key: string) {
  const text = key.replace(/[\s_-]+/g, " ").replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();

  return lower ? lower.charAt(0).toUpperCase() + lower.slice(1) : key;
}

/**
 * Title of one section key, e.g. `symptome` → `{ de: "Symptome", vi: "Triệu
 * chứng" }`. Unknown keys are humanised, so a new section of the AI service
 * shows up without a frontend change.
 */
export function conceptSectionTitle(key: string): BilingualText {
  const known = conceptSectionTitles[normalizeSectionKey(key)];

  if (known) {
    return known;
  }

  const humanized = humanizeSectionKey(key);

  return { de: humanized, vi: humanized };
}

/** One section of an AI explanation, in both course languages. */
export type ConceptSection = {
  /** JSON key of the section (`definition`, `symptome`, ...). */
  key: string;
  de: string;
  vi: string;
};

/** The concept name plus every section the AI returned, in response order. */
export type ConceptExplanation = {
  concept: string;
  sections: ConceptSection[];
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
 * Keys that describe the payload itself instead of a section. Every other key
 * is treated as a section, which is how the category-specific JSON structure
 * (`symptome`, `diagnose`, ...) is picked up without a whitelist.
 */
const conceptMetadataKeys = new Set([
  "success",
  "concept",
  "category",
  "detail",
  "error",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Sections are read from `sections` when the service nests them, otherwise
 * from the top level (the current flat contract).
 */
function sectionSource(record: Record<string, unknown>) {
  return isRecord(record.sections) ? record.sections : record;
}

/**
 * Reads an `/explain-concept` payload defensively. Every section the model
 * returned is kept in response order with its `{ de, vi }` texts; empty
 * sections are dropped. Returns `null` when no section is usable, which the AI
 * service treats as an empty answer as well.
 */
export function parseConceptExplanation(
  value: unknown,
  fallbackConcept = "",
  fallbackLocale: Locale = defaultLocale,
): ConceptExplanation | null {
  if (!isRecord(value)) {
    return null;
  }

  const sections: ConceptSection[] = [];

  for (const [key, rawSection] of Object.entries(sectionSource(value))) {
    const name = key.trim();

    if (!name || conceptMetadataKeys.has(name.toLowerCase())) {
      continue;
    }

    const text = readLocalizedText(rawSection, fallbackLocale);

    if (!hasLocalizedText(text)) {
      continue;
    }

    sections.push({ key: name, de: text.de, vi: text.vi });
  }

  if (sections.length === 0) {
    return null;
  }

  return {
    concept: readText(value.concept) || fallbackConcept,
    sections,
  };
}
