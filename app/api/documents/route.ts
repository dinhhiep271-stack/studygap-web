import { NextResponse } from "next/server";
import { readableFileName } from "@/lib/chapters";
import { getCurrentUserId } from "@/lib/current-user";
import { parseCurriculum, type ParsedCurriculum } from "@/lib/curriculum";
import { defaultLocale, hasLocale } from "@/lib/locales";
import { saveSubjectDocument } from "@/lib/subject-documents";
import { getSubject } from "@/lib/subjects";

/**
 * POST /api/documents
 *
 * Persists the JSON returned by the studygap-ai service for one uploaded
 * document (PDF, Word, Excel, text or CSV).
 * Body: { subjectId, fileName, language, pages?, truncated?, curriculum }.
 *
 * The AI contract (`teaching` + `questions`) is stored verbatim in
 * `Document.content`; the subject page parses it with `parseCurriculum`.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/** Reject payloads that would store an empty document. */
function hasContent(curriculum: ParsedCurriculum) {
  return (
    Boolean(curriculum.summary) ||
    Boolean(curriculum.summaryDe) ||
    Boolean(curriculum.summaryVi) ||
    curriculum.keyConcepts.length > 0 ||
    curriculum.conceptsDe.length > 0 ||
    curriculum.conceptsVi.length > 0 ||
    curriculum.formulas.length > 0 ||
    curriculum.examples.length > 0 ||
    curriculum.questions.length > 0
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  if (!isRecord(body)) {
    return badRequest("The request body must be a JSON object.");
  }

  const subjectId =
    typeof body.subjectId === "string" ? body.subjectId.trim() : "";
  const subject = getSubject(subjectId);

  if (!subject) {
    return badRequest("Unknown subjectId.");
  }

  const fileName =
    typeof body.fileName === "string" ? body.fileName.trim() : "";

  if (!fileName) {
    return badRequest("fileName is required.");
  }

  const requestedLanguage =
    typeof body.language === "string" ? body.language.trim().toLowerCase() : "";
  const language = hasLocale(requestedLanguage)
    ? requestedLanguage
    : defaultLocale;

  if (!isRecord(body.curriculum) || !hasContent(parseCurriculum(body.curriculum))) {
    return badRequest("curriculum must contain a teaching or questions payload.");
  }

  const pages =
    typeof body.pages === "number" &&
    Number.isInteger(body.pages) &&
    body.pages >= 0
      ? body.pages
      : null;

  try {
    const curriculum = parseCurriculum(body.curriculum);
    const userId = await getCurrentUserId();
    const document = await saveSubjectDocument({
      userId,
      subjectId,
      fileName,
      title: curriculum.title.trim() || readableFileName(fileName),
      language,
      pages,
      truncated: body.truncated === true,
      content: body.curriculum,
      subject: {
        name: subject.name.vi,
        nameDe: subject.name.de,
        description: subject.summary.vi,
      },
    });

    return NextResponse.json({ document, subjectId, language }, { status: 201 });
  } catch (error) {
    console.error("Could not save the uploaded document.", error);

    return NextResponse.json(
      { error: "Could not save the document." },
      { status: 500 },
    );
  }
}
