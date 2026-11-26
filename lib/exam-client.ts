import type { ExamKind, GeneratedExam } from "@/lib/exam";

/** Client helper for `POST /api/exams` (used by the practice generator + final exam). */

export type CreateExamInput = {
  subjectId: string;
  kind: ExamKind;
  chapterId?: string;
  count: number;
  durationMinutes?: number;
  lang: string;
};

export class ExamRequestError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "ExamRequestError";
    this.code = code;
  }
}

export async function createExam(
  input: CreateExamInput,
  signal?: AbortSignal,
): Promise<GeneratedExam> {
  let response: Response;

  try {
    response = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw new ExamRequestError("network");
  }

  const payload = (await response.json().catch(() => null)) as
    | { exam?: GeneratedExam; error?: string }
    | null;

  if (!response.ok || !payload?.exam) {
    throw new ExamRequestError(payload?.error ?? "upstream");
  }

  return payload.exam;
}
