import { NextResponse } from "next/server";
import {
  ConceptExplanationError,
  explainConcept,
} from "@/lib/concept-service";
import { defaultLocale, hasLocale } from "@/lib/locales";

/**
 * POST /api/concepts
 *
 * Explains one key concept through the AI service (`POST /explain-concept`).
 * Body: `{ concept, context?, lang? }`.
 *
 * The browser cannot call the AI service directly because `STUDYGAP_API_URL`
 * is server-only, so this route is the proxy. The response is
 * `{ explanation: ConceptExplanation }`; errors are `{ error: <code>, detail }`
 * so the dialog can pick a localized message.
 */

/** Guard rails: the AI service truncates as well, this keeps bodies small. */
const MAX_CONCEPT_LENGTH = 200;
const MAX_CONTEXT_LENGTH = 6_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function badRequest(error: string, detail?: string) {
  return NextResponse.json({ error, detail }, { status: 400 });
}

function failure(error: unknown) {
  if (error instanceof ConceptExplanationError) {
    const status = error.code === "timeout" ? 504 : 502;

    return NextResponse.json(
      { error: error.code, detail: error.message },
      { status },
    );
  }

  console.error("Could not explain the concept.", error);

  return NextResponse.json({ error: "unknown" }, { status: 502 });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("invalid-json");
  }

  if (!isRecord(body)) {
    return badRequest("invalid-body");
  }

  // Collapse whitespace so "  Skonto  " and "Skonto" hit the same model prompt.
  const concept =
    typeof body.concept === "string"
      ? body.concept.replace(/\s+/g, " ").trim()
      : "";

  if (!concept) {
    return badRequest("missing-concept");
  }

  const context =
    typeof body.context === "string"
      ? body.context.trim().slice(0, MAX_CONTEXT_LENGTH)
      : "";
  const requestedLang =
    typeof body.lang === "string" ? body.lang.trim().toLowerCase() : "";
  const lang = hasLocale(requestedLang) ? requestedLang : defaultLocale;

  try {
    const explanation = await explainConcept({
      concept: concept.slice(0, MAX_CONCEPT_LENGTH),
      context,
      lang,
    });

    return NextResponse.json({ explanation });
  } catch (error) {
    return failure(error);
  }
}
