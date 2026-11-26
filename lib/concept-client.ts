import {
  isConceptErrorCode,
  parseConceptExplanation,
  type ConceptErrorCode,
  type ConceptExplanation,
} from "@/lib/concept";

/**
 * Client helper for `POST /api/concepts` (concept cards on the subject page).
 *
 * The route handler forwards the request to the AI service with
 * `STUDYGAP_API_URL`, so the server-only variable never reaches the browser.
 */

export class ConceptRequestError extends Error {
  readonly code: ConceptErrorCode;

  constructor(code: ConceptErrorCode) {
    super(code);
    this.name = "ConceptRequestError";
    this.code = code;
  }
}

export async function fetchConceptExplanation(
  {
    concept,
    lang,
    context,
  }: { concept: string; lang: string; context?: string },
  signal?: AbortSignal,
): Promise<ConceptExplanation> {
  let response: Response;

  try {
    response = await fetch("/api/concepts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concept, context, lang }),
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw new ConceptRequestError("network");
  }

  const payload = (await response.json().catch(() => null)) as
    | { explanation?: unknown; error?: unknown }
    | null;

  if (response.status === 401) {
    throw new ConceptRequestError("unauthorized");
  }

  if (!response.ok) {
    throw new ConceptRequestError(
      isConceptErrorCode(payload?.error) ? payload.error : "upstream",
    );
  }

  const explanation = parseConceptExplanation(payload?.explanation, concept);

  if (!explanation) {
    throw new ConceptRequestError("empty");
  }

  return explanation;
}
