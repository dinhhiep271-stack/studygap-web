import { normalizeApiBaseUrl } from "@/lib/api-url";
import {
  parseConceptExplanation,
  type ConceptCategory,
  type ConceptErrorCode,
  type ConceptExplanation,
} from "@/lib/concept";
import type { Locale } from "@/lib/locales";

/**
 * Server-only helper for the AI concept explainer (`POST /explain-concept`).
 *
 * `STUDYGAP_API_URL` is a server variable (it is not inlined into the client
 * bundle), so the browser calls the `POST /api/concepts` route handler, which
 * uses this helper. `NEXT_PUBLIC_STUDYGAP_API_URL` is only a fallback so one
 * setting keeps working for both the server and the browser.
 */

const AI_BASE_URL = normalizeApiBaseUrl(
  process.env.STUDYGAP_API_URL || process.env.NEXT_PUBLIC_STUDYGAP_API_URL,
);

/** One concept is a single short model call; keep the upstream budget bounded. */
const AI_TIMEOUT_MS = 120_000;

export class ConceptExplanationError extends Error {
  readonly code: ConceptErrorCode;

  constructor(code: ConceptErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ConceptExplanationError";
    this.code = code;
  }
}

type ExplainResponse = {
  success?: boolean;
  detail?: string;
  error?: string;
  /** Section keys are category-specific, so only the metadata is typed. */
  [key: string]: unknown;
};

/**
 * Calls the FastAPI service. `lang` selects the request language (and the
 * fallback slot of legacy single-language answers), `category` tells the model
 * which section structure to use (`general` or `medical`). Current responses
 * carry both languages in every section. All failures become
 * `ConceptExplanationError`.
 */
export async function explainConcept({
  concept,
  context = "",
  category = "general",
  lang,
}: {
  concept: string;
  /** Related chapter material the model may ground the explanation on. */
  context?: string;
  /** Picked from the subject name (`conceptCategoryForSubject`). */
  category?: ConceptCategory;
  lang: Locale;
}): Promise<ConceptExplanation> {
  let response: Response;

  try {
    response = await fetch(`${AI_BASE_URL}/explain-concept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concept, context, category, lang }),
      cache: "no-store",
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new ConceptExplanationError("timeout");
    }

    throw new ConceptExplanationError("network");
  }

  const payload = (await response.json().catch(() => null)) as
    | ExplainResponse
    | null;

  if (!response.ok) {
    throw new ConceptExplanationError(
      "upstream",
      payload?.detail ??
        payload?.error ??
        `AI service answered ${response.status}`,
    );
  }

  const explanation = parseConceptExplanation(payload, concept, lang, category);

  if (!explanation) {
    throw new ConceptExplanationError("empty");
  }

  return explanation;
}
