import { NextResponse } from "next/server";
import { readableFileName } from "@/lib/chapters";
import { getCurrentUserId } from "@/lib/current-user";
import {
  clampExamDuration,
  clampQuestionCount,
  isExamKind,
  type ExamKind,
} from "@/lib/exam";
import {
  buildExamContext,
  ExamGenerationError,
  existingQuestionStems,
  generateExamQuestions,
  normalizeGeneratedQuestions,
  saveExam,
  type ExamContextChapter,
} from "@/lib/exam-service";
import { defaultLocale, hasLocale } from "@/lib/locales";
import { findSubjectProfile } from "@/lib/subject-catalog";
import {
  documentsForLocale,
  getSubjectDocuments,
} from "@/lib/subject-documents";

/**
 * POST /api/exams
 *
 * Generates a new paper with the AI service and stores it.
 * Body: { subjectId, kind: "chapter" | "final", chapterId?, count?,
 *         durationMinutes?, lang? }.
 *
 * - `chapter` → questions from one chapter (the "Tạo đề mới" button),
 * - `final`   → questions from every chapter of the subject (final exam).
 *
 * The response is `{ exam }` in the shape of `GeneratedExam`; errors are
 * `{ error: <code>, detail }` so the client can localise the message.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function badRequest(error: string, detail?: string) {
  return NextResponse.json({ error, detail }, { status: 400 });
}

function failure(error: unknown) {
  if (error instanceof ExamGenerationError) {
    const status = error.code === "timeout" ? 504 : 502;

    return NextResponse.json(
      { error: error.code, detail: error.message },
      { status },
    );
  }

  console.error("Could not generate the exam.", error);

  return NextResponse.json({ error: "upstream" }, { status: 502 });
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

  const subjectId =
    typeof body.subjectId === "string" ? body.subjectId.trim() : "";

  const kind: ExamKind = isExamKind(body.kind) ? body.kind : "chapter";
  const requestedLang =
    typeof body.lang === "string" ? body.lang.trim().toLowerCase() : "";
  const language = hasLocale(requestedLang) ? requestedLang : defaultLocale;

  const count = clampQuestionCount(
    kind,
    typeof body.count === "number" ? body.count : Number.NaN,
  );
  const durationMinutes = clampExamDuration(
    typeof body.durationMinutes === "number"
      ? body.durationMinutes
      : Number.NaN,
  );

  // Only the signed-in user's material may be used to build a paper. Bilingual
  // chapters are valid for both locales, legacy ones only for their upload
  // language.
  const userId = await getCurrentUserId();

  // Static subjects resolve without a query; self-created ones only within the
  // user's own rows (`findSubjectProfile`).
  const subject = await findSubjectProfile(userId, subjectId);

  if (!subject) {
    return badRequest("unknown-subject");
  }

  const storedDocuments = await getSubjectDocuments(userId, subjectId);
  const documents = documentsForLocale(storedDocuments, language);

  if (documents.length === 0) {
    return badRequest("no-material");
  }

  const chapters: ExamContextChapter[] = documents.map((document) => ({
    id: document.id,
    title: document.title?.trim() || readableFileName(document.fileName),
    curriculum: document.curriculum,
  }));

  let scopeChapters = chapters;

  if (kind === "chapter") {
    const chapterId =
      typeof body.chapterId === "string" ? body.chapterId.trim() : "";
    const chapter = chapters.find((item) => item.id === chapterId);

    if (!chapter) {
      return badRequest("unknown-chapter");
    }

    scopeChapters = [chapter];
  }

  const context = buildExamContext(scopeChapters, kind, language);

  if (!context.trim()) {
    return badRequest("no-material");
  }

  try {
    const generated = await generateExamQuestions({
      context,
      kind,
      count,
      lang: language,
      chapterTitles: scopeChapters.map((chapter) => chapter.title),
      existingQuestions: existingQuestionStems(scopeChapters),
    });
    const questions = normalizeGeneratedQuestions(generated.questions, {
      count,
      kind,
      chapters: scopeChapters,
    });

    if (questions.length === 0) {
      throw new ExamGenerationError("empty");
    }

    const exam = await saveExam({
      userId,
      subjectId,
      documentId: kind === "chapter" ? scopeChapters[0].id : null,
      kind,
      language,
      title:
        kind === "final"
          ? subject.name[language]
          : scopeChapters[0].title,
      durationMinutes,
      chapters: scopeChapters.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
      })),
      questions,
    });

    return NextResponse.json({ exam }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
