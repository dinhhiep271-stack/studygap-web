/**
 * Shared contract of the AI concept explainer (`POST /explain-concept`).
 *
 * The FastAPI service always answers with four sections whose JSON keys are
 * German (`definition`, `erklaerung`, `zusammenhang`, `kritik`); only the text
 * follows `lang`. The UI captions live in the dictionary (`dict.concept`) so
 * the dialog can be localised without touching this contract.
 */

/** Section keys of the concept explanation, in display order. */
export const conceptSectionKeys = [
  "definition",
  "erklaerung",
  "zusammenhang",
  "kritik",
] as const;

export type ConceptSectionKey = (typeof conceptSectionKeys)[number];

/** The four parts of one AI explanation, already trimmed to strings. */
export type ConceptExplanation = {
  concept: string;
  definition: string;
  erklaerung: string;
  zusammenhang: string;
  kritik: string;
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

/**
 * Reads an `/explain-concept` payload defensively and returns `null` when the
 * model delivered neither a definition nor an explanation (the AI service
 * rejects that case as well).
 */
export function parseConceptExplanation(
  value: unknown,
  fallbackConcept = "",
): ConceptExplanation | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const explanation: ConceptExplanation = {
    concept: readText(record.concept) || fallbackConcept,
    definition: readText(record.definition),
    erklaerung: readText(record.erklaerung),
    zusammenhang: readText(record.zusammenhang),
    kritik: readText(record.kritik),
  };

  return explanation.definition || explanation.erklaerung ? explanation : null;
}
