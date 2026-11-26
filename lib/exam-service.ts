import type { CurriculumQuestion, ParsedCurriculum } from "@/lib/curriculum";
import { parseQuestions } from "@/lib/curriculum";
import {
  clampQuestionCount,
  isExamKind,
  type ExamChapterRef,
  type ExamErrorCode,
  type ExamKind,
  type GeneratedExam,
} from "@/lib/exam";
import { isPracticeReady, normalizeText } from "@/lib/practice";
import { prisma } from "@/lib/prisma";

/**
 * Server-only helpers for AI-generated exams:
 * - turns stored chapter material into a compact "knowledge framework",
 * - calls the FastAPI service (`POST /generate-exam`),
 * - validates / de-duplicates the returned questions,
 * - persists the paper so it can be reopened via `?exam=<id>`.
 */

export class ExamGenerationError extends Error {
  readonly code: ExamErrorCode;

  constructor(code: ExamErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ExamGenerationError";
    this.code = code;
  }
}

/** Everything the context builder needs about one chapter. */
export type ExamContextChapter = {
  id: string;
  title: string;
  curriculum: ParsedCurriculum;
};

/** Keep the framework small enough for the prompt budget of the AI service. */
const MAX_CONTEXT_CHARS = 14_000;
const MAX_EXISTING_QUESTIONS = 15;

const AI_BASE_URL = (
  process.env.STUDYGAP_API_URL ??
  process.env.NEXT_PUBLIC_STUDYGAP_API_URL ??
  "https://studygap-ai.onrender.com"
).replace(/\/+$/, "");

const AI_TIMEOUT_MS = 240_000;

function truncate(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }

  return copy;
}

function chapterBlock(chapter: ExamContextChapter, limit: number) {
  const { curriculum } = chapter;
  const lines = [`### CHƯƠNG: ${chapter.title}`];

  if (curriculum.summary) {
    lines.push(`Tóm tắt: ${curriculum.summary}`);
  }

  if (curriculum.keyConcepts.length > 0) {
    lines.push(
      `Khái niệm chính: ${curriculum.keyConcepts
        .slice(0, 12)
        .map((concept) =>
          concept.explanation
            ? `${concept.name} (${concept.explanation})`
            : concept.name,
        )
        .join("; ")}`,
    );
  }

  if (curriculum.formulas.length > 0) {
    lines.push(
      `Công thức: ${curriculum.formulas
        .slice(0, 8)
        .map((formula) =>
          formula.description
            ? `${formula.formula} — ${formula.description}`
            : formula.formula,
        )
        .join("; ")}`,
    );
  }

  if (curriculum.examples.length > 0) {
    lines.push(
      `Ví dụ: ${curriculum.examples
        .slice(0, 3)
        .map((example) =>
          [example.title, example.problem, example.solution]
            .filter(Boolean)
            .join(" → "),
        )
        .join(" || ")}`,
    );
  }

  return truncate(lines.join("\n"), limit);
}

/**
 * Builds the knowledge framework sent to the model. A final exam includes every
 * chapter (shuffled so repeated papers weigh the chapters differently); a
 * chapter practice only includes that chapter.
 */
export function buildExamContext(
  chapters: ExamContextChapter[],
  kind: ExamKind,
): string {
  const ordered = kind === "final" ? shuffle(chapters) : chapters;
  const perChapter = Math.max(
    900,
    Math.floor(MAX_CONTEXT_CHARS / Math.max(1, ordered.length)),
  );

  return ordered
    .map((chapter) => chapterBlock(chapter, perChapter))
    .join("\n\n")
    .slice(0, MAX_CONTEXT_CHARS);
}

/** Unique, normalised question stems the model should avoid repeating. */
export function existingQuestionStems(chapters: ExamContextChapter[]) {
  const stems = chapters.flatMap((chapter) =>
    chapter.curriculum.questions
      .filter(isPracticeReady)
      .map((question) => question.question.trim())
      .filter(Boolean),
  );

  return shuffle([...new Set(stems)]).slice(0, MAX_EXISTING_QUESTIONS);
}

type GenerateResponse = {
  success?: boolean;
  questions?: unknown;
  count?: number;
  model?: string;
  detail?: string;
  error?: string;
};

/** Calls the FastAPI service; all failures become `ExamGenerationError`. */
export async function generateExamQuestions({
  context,
  kind,
  count,
  lang,
  chapterTitles,
  existingQuestions,
}: {
  context: string;
  kind: ExamKind;
  count: number;
  lang: string;
  chapterTitles: string[];
  existingQuestions: string[];
}): Promise<{ questions: CurriculumQuestion[] }> {
  let response: Response;

  try {
    response = await fetch(`${AI_BASE_URL}/generate-exam`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context,
        scope: kind,
        count,
        lang,
        chapter_titles: chapterTitles,
        existing_questions: existingQuestions,
        seed: Math.floor(Math.random() * 1_000_000_000),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new ExamGenerationError("timeout");
    }

    throw new ExamGenerationError("network");
  }

  const payload = (await response.json().catch(() => null)) as
    | GenerateResponse
    | null;

  if (!response.ok) {
    throw new ExamGenerationError(
      "upstream",
      payload?.detail ?? payload?.error ?? `AI service answered ${response.status}`,
    );
  }

  const parsed = parseQuestions(payload?.questions);

  if (parsed.length === 0) {
    throw new ExamGenerationError("empty");
  }

  return { questions: parsed };
}

/**
 * Keeps only answerable, unique questions, drops copies of the stored ones and
 * shuffles the order so types are not grouped by the model.
 */
export function normalizeGeneratedQuestions(
  questions: CurriculumQuestion[],
  {
    count,
    kind,
    chapters,
  }: { count: number; kind: ExamKind; chapters: ExamContextChapter[] },
): CurriculumQuestion[] {
  const blocked = new Set(
    chapters.flatMap((chapter) =>
      chapter.curriculum.questions.map((question) =>
        normalizeText(question.question),
      ),
    ),
  );
  const seen = new Set<string>();
  const unique: CurriculumQuestion[] = [];

  for (const question of questions) {
    if (!isPracticeReady(question) || !question.question.trim()) {
      continue;
    }

    const key = normalizeText(question.question);

    if (!key || seen.has(key) || blocked.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(question);
  }

  return shuffle(unique).slice(0, clampQuestionCount(kind, count));
}

type ExamContent = {
  questions: CurriculumQuestion[];
  chapters: ExamChapterRef[];
};

function parseExamContent(content: string): ExamContent {
  try {
    const parsed: unknown = JSON.parse(content);

    if (typeof parsed !== "object" || parsed === null) {
      return { questions: [], chapters: [] };
    }

    const record = parsed as Record<string, unknown>;
    const chapters = Array.isArray(record.chapters)
      ? record.chapters.flatMap((item) => {
          if (typeof item !== "object" || item === null) {
            return [];
          }

          const chapter = item as Record<string, unknown>;

          return typeof chapter.id === "string" &&
            typeof chapter.title === "string"
            ? [{ id: chapter.id, title: chapter.title }]
            : [];
        })
      : [];

    return { questions: parseQuestions(record.questions), chapters };
  } catch {
    return { questions: [], chapters: [] };
  }
}

type ExamRow = {
  id: string;
  subjectId: string;
  kind: string;
  language: string;
  title: string;
  durationMinutes: number;
  questionCount: number;
  content: string;
  createdAt: Date;
};

const examSelect = {
  id: true,
  subjectId: true,
  kind: true,
  language: true,
  title: true,
  durationMinutes: true,
  questionCount: true,
  content: true,
  createdAt: true,
} as const;

function toGeneratedExam(row: ExamRow): GeneratedExam {
  const content = parseExamContent(row.content);

  return {
    id: row.id,
    subjectId: row.subjectId,
    kind: isExamKind(row.kind) ? row.kind : "chapter",
    language: row.language,
    title: row.title,
    durationMinutes: row.durationMinutes,
    questionCount: content.questions.length || row.questionCount,
    chapters: content.chapters,
    questions: content.questions,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Persists a generated paper. `subjectId` already exists (documents reference it). */
export async function saveExam({
  subjectId,
  documentId,
  kind,
  language,
  title,
  durationMinutes,
  chapters,
  questions,
}: {
  subjectId: string;
  documentId: string | null;
  kind: ExamKind;
  language: string;
  title: string;
  durationMinutes: number;
  chapters: ExamChapterRef[];
  questions: CurriculumQuestion[];
}): Promise<GeneratedExam> {
  const row = await prisma.exam.create({
    data: {
      subjectId,
      documentId,
      kind,
      language,
      title,
      durationMinutes,
      questionCount: questions.length,
      content: JSON.stringify({ chapters, questions }),
    },
    select: examSelect,
  });

  return toGeneratedExam(row);
}

/** Loads a stored paper for `?exam=<id>`; a missing table yields `null`. */
export async function getExam(id: string): Promise<GeneratedExam | null> {
  try {
    const row = await prisma.exam.findUnique({
      where: { id },
      select: examSelect,
    });

    return row ? toGeneratedExam(row) : null;
  } catch (error) {
    console.error(
      `Could not load exam "${id}". Run "npm run db:push" to create the tables.`,
      error,
    );
    return null;
  }
}

