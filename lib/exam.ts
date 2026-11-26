import type { CurriculumQuestion } from "@/lib/curriculum";
import type { Locale } from "@/lib/locales";
import {
  gradeQuestion,
  isAnswerComplete,
  type QuestionAnswer,
} from "@/lib/practice";

/**
 * Exam domain shared by the API route, the server page and the client runner.
 * Everything here is pure so it can run on both sides of the RSC boundary.
 */

export const examKinds = ["chapter", "final"] as const;

export type ExamKind = (typeof examKinds)[number];

export function isExamKind(value: unknown): value is ExamKind {
  return (
    typeof value === "string" &&
    (examKinds as readonly string[]).includes(value)
  );
}

/** Durations offered by the final-exam setup (minutes). */
export const examDurations = [30, 60, 90, 120] as const;

export const defaultExamDuration = 60;

export const chapterQuestionLimit = { min: 1, max: 20, default: 10 } as const;
export const finalQuestionLimit = { min: 5, max: 30, default: 20 } as const;

export function questionLimitFor(kind: ExamKind) {
  return kind === "final" ? finalQuestionLimit : chapterQuestionLimit;
}

/** Clamp a user-provided question count for the given exam kind. */
export function clampQuestionCount(kind: ExamKind, value: number) {
  const limit = questionLimitFor(kind);
  const count = Number.isFinite(value) ? Math.round(value) : limit.default;

  return Math.min(limit.max, Math.max(limit.min, count));
}

/** Clamp a user-provided duration to one of the offered values. */
export function clampExamDuration(value: number) {
  const minutes = Number.isFinite(value) ? Math.round(value) : defaultExamDuration;

  return (examDurations as readonly number[]).includes(minutes)
    ? minutes
    : defaultExamDuration;
}

export type ExamChapterRef = {
  id: string;
  title: string;
};

/** One stored exam, ready for the runner (dates as ISO strings). */
export type GeneratedExam = {
  id: string;
  subjectId: string;
  kind: ExamKind;
  language: string;
  title: string;
  durationMinutes: number;
  questionCount: number;
  chapters: ExamChapterRef[];
  questions: CurriculumQuestion[];
  /** ISO timestamp of the generation, used for the result card. */
  createdAt: string;
};

export type ExamResult = {
  total: number;
  correct: number;
  incorrect: number;
  /** Unanswered questions count as incorrect for the score, but are listed apart. */
  unanswered: number;
  percent: number;
  passed: boolean;
};

/**
 * Grades a whole paper. `answers` may be sparse: a question without an entry
 * (or with an incomplete entry) is counted as "unanswered", which also counts
 * as wrong so the score can never exceed the number of correct answers.
 */
export function gradeExam(
  questions: CurriculumQuestion[],
  answers: Record<number, QuestionAnswer>,
): { results: boolean[]; result: ExamResult } {
  const results: boolean[] = [];
  let correct = 0;
  let unanswered = 0;

  questions.forEach((question, index) => {
    const answer = answers[index];

    if (!answer || !isAnswerComplete(question, answer)) {
      unanswered += 1;
      results.push(false);
      return;
    }

    const isCorrect = gradeQuestion(question, answer);
    results.push(isCorrect);

    if (isCorrect) {
      correct += 1;
    }
  });

  const total = questions.length;
  const percent = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;

  return {
    results,
    result: {
      total,
      correct,
      incorrect: total - correct - unanswered,
      unanswered,
      percent,
      passed: percent >= 50,
    },
  };
}

/**
 * German grade scale (1.0 best, 5.0 fail) and the Vietnamese 10-point scale
 * share one percentage input: `gradeForPercent(85).de === 1.7`,
 * `gradeForPercent(85).vi === 8.5`.
 */
export function gradeForPercent(percent: number) {
  const clamped = Math.max(0, Math.min(100, percent));

  const german =
    clamped >= 95
      ? 1.0
      : clamped >= 90
        ? 1.3
        : clamped >= 85
          ? 1.7
          : clamped >= 80
            ? 2.0
            : clamped >= 75
              ? 2.3
              : clamped >= 70
                ? 2.7
                : clamped >= 65
                  ? 3.0
                  : clamped >= 60
                    ? 3.3
                    : clamped >= 55
                      ? 3.7
                      : clamped >= 50
                        ? 4.0
                        : 5.0;

  return { de: german, vi: Math.round(clamped) / 10 };
}

export function examGrade(percent: number, locale: Locale) {
  const grade = gradeForPercent(percent)[locale].toFixed(1);

  return locale === "de" ? grade.replace(".", ",") : grade;
}

export const examErrorCodes = [
  "network",
  "timeout",
  "upstream",
  "invalid",
  "empty",
] as const;

export type ExamErrorCode = (typeof examErrorCodes)[number];

/** Localised message for an API error code (`no-material`, `network`, …). */
export function examErrorMessage(
  errors: Record<string, string>,
  code: unknown,
) {
  if (typeof code === "string" && Object.hasOwn(errors, code)) {
    return errors[code];
  }

  return errors.unknown;
}

/** "mm:ss" (or "h:mm:ss" above one hour) for the countdown badge. */
export function formatCountdown(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/**
 * Stable localStorage key for the moment an exam attempt started. Keeping the
 * start time in the browser makes the timer survive a reload while the paper
 * itself stays in the database.
 */
export function examStartKey(examId: string) {
  return `studygap:exam-start:${examId}`;
}
