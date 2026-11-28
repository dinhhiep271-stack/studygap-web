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
 * every key it receives (`conceptSectionTitle` maps it to a bilingual caption)
 * instead of hardcoding four sections, and `conceptCategorySections` completes
 * the medical contract so all ten sections appear even when the model omits one.
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
 * Section keys the AI contract defines per category, in response order. Mirrors
 * `CONCEPT_CATEGORY_SECTIONS` in the studygap-ai service; `medical` is the
 * ten-step clinical workflow the dialog has to show in full.
 */
export const conceptCategorySections: Record<
  ConceptCategory,
  readonly string[]
> = {
  general: ["definition", "erklaerung", "zusammenhang", "kritik"],
  medical: [
    "definition",
    "symptome",
    "diagnostik",
    "differentialdiagnosen",
    "therapie",
    "medikamente",
    "prophylaxe",
    "pflegeplanung",
    "komplikationen",
    "prognose",
  ],
};

/**
 * Subject-name keywords that mark a medical subject. The comparison folds
 * case, German umlauts and Vietnamese diacritics, so "Medizin",
 * "MEDIZIN", "Y khoa" and "Điều dưỡng" all match the ASCII keywords below.
 */
export const medicalSubjectKeywords = [
  // German subject names.
  "medizin",
  "pflege",
  "krankheit",
  // English subject names.
  "medical",
  "medicine",
  "nursing",
  // Vietnamese subject names ("y khoa", "điều dưỡng" folded to ASCII).
  "y khoa",
  "dieu duong",
] as const;

/**
 * Lower-cases a value and folds it to ASCII. German umlauts are spelled out
 * first (`ä` → `ae`, so `Erklärung` keeps resolving to `erklaerung`), then
 * remaining diacritics are stripped (`điều dưỡng` → `dieu duong`).
 */
function foldSectionKey(value: string) {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
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
  // German spelling variant the model may answer with.
  differenzialdiagnosen: {
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

/**
 * Heading of a section card: the JSON key in upper case, separators turned into
 * spaces (`symptome` → `SYMPTOME`, `sozial_geschichte` → `SOZIAL GESCHICHTE`).
 */
export function conceptSectionHeading(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
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
 * Keys that describe a section instead of carrying its text. They are ignored
 * when a legacy object without `de`/`vi` keys has to be flattened.
 */
const conceptSectionKeyFields = ["key", "id", "name", "title", "label"] as const;

function sectionKeyOf(record: Record<string, unknown>): string {
  for (const field of conceptSectionKeyFields) {
    const value = record[field];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
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
    const hasLanguageKeys = [
      "de",
      "vi",
      "german",
      "vietnamese",
    ].some((key) => key in record);
    const de = readText(record.de) || readText(record.german);
    const vi = readText(record.vi) || readText(record.vietnamese);

    if (de || vi) {
      return { de, vi };
    }

    // `{ de: "", vi: "" }` is an intentionally empty section (a contract entry
    // the model left out); flattening it would turn its key into content.
    if (hasLanguageKeys) {
      return emptyText();
    }

    // Legacy object without language keys: flatten it into the fallback slot,
    // skipping the structural fields of an already normalised section.
    const text = Object.entries(record)
      .filter(
        ([key]) =>
          !(conceptSectionKeyFields as readonly string[]).includes(
            key.toLowerCase(),
          ),
      )
      .map(([, item]) => readText(item))
      .filter(Boolean)
      .join("\n");

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
 * (`symptome`, `diagnose`, ...) is picked up without a whitelist. `lang`,
 * `model`, `usage` and the `context_*` counters are part of the
 * `/explain-concept` response too, so they must never become a card.
 */
const conceptMetadataKeys = new Set([
  "success",
  "concept",
  "category",
  "detail",
  "error",
  "lang",
  "model",
  "usage",
  "context_characters",
  "context_truncated",
  "sections",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Sections of a payload, in response order, as `[key, value]` pairs. Three
 * shapes are supported because the data passes the dialog twice:
 *
 * - flat top level (`{ definition: { de, vi }, symptome: {...} }`) — the
 *   `/explain-concept` contract of the AI service;
 * - a nested record (`{ sections: { definition: {...} } }`) — older wrapper;
 * - an array of normalised sections (`{ sections: [{ key, de, vi }] }`) — what
 *   `POST /api/concepts` returns after this module already parsed one time.
 */
function sectionEntries(
  record: Record<string, unknown>,
): Array<[string, unknown]> {
  if (Array.isArray(record.sections)) {
    const entries: Array<[string, unknown]> = [];

    for (const item of record.sections) {
      if (!isRecord(item)) {
        continue;
      }

      const key = sectionKeyOf(item);

      if (key) {
        entries.push([key, item]);
      }
    }

    return entries;
  }

  if (isRecord(record.sections)) {
    return Object.entries(record.sections);
  }

  return Object.entries(record);
}

/**
 * Reads an `/explain-concept` payload defensively. Every section the model
 * returned is kept with its `{ de, vi }` texts and payload metadata is skipped.
 * The parser is idempotent: an already normalised `{ concept, sections: [...] }`
 * — the shape `POST /api/concepts` returns — parses to the same explanation, so
 * the dialog can parse the route answer a second time without losing sections.
 *
 * When `category` is given, the result always contains the full contract of
 * that category in contract order (`conceptCategorySections`): a medical answer
 * therefore shows all ten clinical sections, an omitted one simply stays empty
 * and the dialog renders its "no content" note. Keys the contract does not know
 * are appended in response order, so a newer service still reaches the modal
 * without a frontend change. Returns `null` when no section is usable, which
 * the AI service treats as an empty answer as well.
 */
export function parseConceptExplanation(
  value: unknown,
  fallbackConcept = "",
  fallbackLocale: Locale = defaultLocale,
  category?: ConceptCategory,
): ConceptExplanation | null {
  if (!isRecord(value)) {
    return null;
  }

  const parsed: ConceptSection[] = [];
  const seen = new Set<string>();

  for (const [key, rawSection] of sectionEntries(value)) {
    const name = key.trim();

    if (!name || conceptMetadataKeys.has(name.toLowerCase())) {
      continue;
    }

    const normalized = normalizeSectionKey(name);

    if (seen.has(normalized)) {
      continue;
    }

    const text = readLocalizedText(rawSection, fallbackLocale);

    if (!hasLocalizedText(text)) {
      continue;
    }

    seen.add(normalized);
    parsed.push({ key: name, de: text.de, vi: text.vi });
  }

  if (parsed.length === 0) {
    return null;
  }

  const sections: ConceptSection[] = [];
  const used = new Set<string>();

  // Complete the contract of the category first: every key in contract order,
  // even one the model left out.
  for (const key of category ? conceptCategorySections[category] : []) {
    const normalized = normalizeSectionKey(key);
    const match = parsed.find(
      (section) => normalizeSectionKey(section.key) === normalized,
    );

    used.add(normalized);
    sections.push(match ?? { key, de: "", vi: "" });
  }

  // Sections outside the contract keep their response order after the contract.
  for (const section of parsed) {
    const normalized = normalizeSectionKey(section.key);

    if (used.has(normalized)) {
      continue;
    }

    used.add(normalized);
    sections.push(section);
  }

  return {
    concept: readText(value.concept) || fallbackConcept,
    sections,
  };
}
