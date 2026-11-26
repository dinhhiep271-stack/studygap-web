"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  QuestionAnswerInput,
  QuestionFeedback,
} from "@/components/question-input";
import {
  examGrade,
  examStartKey,
  formatCountdown,
  gradeExam,
  type ExamResult,
  type GeneratedExam,
} from "@/lib/exam";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/locales";
import {
  createQuestionAnswer,
  isAnswerComplete,
  practiceFormatOf,
  type QuestionAnswer,
} from "@/lib/practice";

type Labels = Dictionary["exam"];
type PracticeLabels = Dictionary["practice"];

/**
 * Runs a generated paper.
 *
 * - `exam.kind === "final"` → timed exam: countdown in the header, automatic
 *   submission when the time is up, score + per-question review afterwards.
 * - `exam.kind === "chapter"` → untimed practice paper: answer everything, then
 *   submit to see the score and explanations ("Làm lại" resets the answers).
 *
 * The attempt start is stored per browser (`examStartKey`) so reloading the page
 * keeps the remaining time while the paper itself stays in the database.
 */
export function ExamRunner({
  exam,
  labels,
  practiceLabels,
  locale,
  onExit,
}: {
  exam: GeneratedExam;
  labels: Labels;
  practiceLabels: PracticeLabels;
  locale: Locale;
  onExit: () => void;
}) {
  const mode = exam.kind === "final" ? "exam" : "practice";
  const totalSeconds = Math.max(1, exam.durationMinutes) * 60;
  const [answers, setAnswers] = useState<Record<number, QuestionAnswer>>({});
  const [submitted, setSubmitted] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const autoRef = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Start (or resume) the timer of a timed exam.
  useEffect(() => {
    if (mode !== "exam") {
      return;
    }

    const key = examStartKey(exam.id);
    let stored = 0;

    try {
      stored = Number(window.localStorage.getItem(key)) || 0;
    } catch {
      stored = 0;
    }

    // A previous attempt that is already over is treated as a new attempt.
    const expired =
      !Number.isFinite(stored) ||
      stored <= 0 ||
      Date.now() - stored > totalSeconds * 1000;
    const started = expired ? Date.now() : stored;

    if (expired) {
      try {
        window.localStorage.setItem(key, String(started));
      } catch {
        // Storage can be unavailable (private mode): the timer still runs.
      }
    }

    // Deferred through a timer so the effect only subscribes to the clock
    // (`react-hooks/set-state-in-effect`).
    const frame = window.setTimeout(() => {
      setStartedAt(started);
      setNow(Date.now());
    }, 0);

    return () => window.clearTimeout(frame);
  }, [exam.id, mode, totalSeconds]);

  useEffect(() => {
    if (mode !== "exam" || startedAt === null || submitted) {
      return;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, [mode, startedAt, submitted]);

  const secondsLeft =
    mode === "exam" && startedAt !== null && now !== null
      ? Math.max(
          0,
          Math.ceil((startedAt + totalSeconds * 1000 - now) / 1000),
        )
      : totalSeconds;

  const submit = useCallback(
    (auto: boolean) => {
      const graded = gradeExam(exam.questions, answers);

      setResults(graded.results);
      setResult(graded.result);
      setSubmitted(true);
      setAutoSubmitted(auto);

      if (mode === "exam") {
        try {
          window.localStorage.removeItem(examStartKey(exam.id));
        } catch {
          // Ignore storage errors; the exam is already graded.
        }
      }
    },
    [answers, exam.id, exam.questions, mode],
  );

  // Auto-submit when the countdown reaches zero.
  useEffect(() => {
    if (mode !== "exam" || submitted) {
      return;
    }

    if (startedAt === null || now === null) {
      return;
    }

    if (now < startedAt + totalSeconds * 1000) {
      return;
    }

    // Deferred like the start timer: submitting updates React state, which the
    // lint rule forbids directly inside an effect body.
    const timeout = window.setTimeout(() => {
      autoRef.current = true;
      submit(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [mode, now, startedAt, submit, submitted, totalSeconds]);

  useEffect(() => {
    if (submitted) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [submitted]);

  const answeredCount = useMemo(
    () =>
      exam.questions.reduce(
        (count, question, index) =>
          answers[index] && isAnswerComplete(question, answers[index])
            ? count + 1
            : count,
        0,
      ),
    [answers, exam.questions],
  );

  const questionTotal = Math.max(1, exam.questions.length);
  const timerTone =
    secondsLeft <= 60
      ? "border-red-200 bg-red-50 text-red-700"
      : secondsLeft <= 300
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-800";

  function updateAnswer(index: number, patch: Partial<QuestionAnswer>) {
    setAnswers((previous) => {
      const current =
        previous[index] ?? createQuestionAnswer(exam.questions[index]);

      return { ...previous, [index]: { ...current, ...patch } };
    });
  }

  function resetAttempt() {
    setAnswers({});
    setResults([]);
    setResult(null);
    setSubmitted(false);
    setAutoSubmitted(false);
    autoRef.current = false;
  }

  return (
    <section
      data-exam-id={exam.id}
      data-exam-kind={exam.kind}
      data-exam-status={submitted ? "submitted" : "in-progress"}
      className="space-y-5"
    >
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-700">
              {mode === "exam"
                ? labels.runnerEyebrowFinal
                : labels.runnerEyebrowChapter}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
              {exam.title}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-100">
                {exam.questions.length} {practiceLabels.questionsUnit}
              </span>
              {mode === "exam" ? (
                <>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">
                    {labels.finalScope}: {exam.chapters.length}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">
                    {labels.finalDurationLabel}: {exam.durationMinutes} min
                  </span>
                </>
              ) : (
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">
                  {labels.runnerEyebrowChapter}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {mode === "exam" ? (
              <div
                data-exam-timer={secondsLeft}
                className={`rounded-xl border px-4 py-2 text-right ${timerTone}`}
              >
                <p className="text-[11px] font-semibold tracking-wide uppercase">
                  {labels.timeLeft}
                </p>
                <p
                  role="timer"
                  className="font-mono text-2xl font-semibold tabular-nums"
                >
                  {formatCountdown(secondsLeft)}
                </p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onExit}
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900"
            >
              {labels.exit}
            </button>
          </div>
        </div>


        {submitted && result ? (
          <div
            ref={resultRef}
            data-exam-result={result.percent}
            className="mt-6 overflow-hidden rounded-2xl border border-emerald-200"
          >
            <div
              className={`px-5 py-5 sm:px-6 ${
                result.passed ? "bg-emerald-50/80" : "bg-red-50/70"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    {labels.resultTitle}
                  </p>
                  <p className="mt-1 text-4xl font-semibold tracking-tight text-zinc-900">
                    {result.percent}%
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-600">
                    {labels.gradeLabel}:{" "}
                    <span className="font-semibold text-zinc-900">
                      {examGrade(result.percent, locale)}
                    </span>
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ${
                    result.passed
                      ? "bg-white text-emerald-700 ring-emerald-200"
                      : "bg-white text-red-700 ring-red-200"
                  }`}
                >
                  {result.passed ? labels.resultPassed : labels.resultFailed}
                </span>
              </div>

              {autoSubmitted ? (
                <p
                  role="status"
                  className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-amber-200"
                >
                  {labels.timeUp}
                </p>
              ) : null}
            </div>

            <dl className="grid grid-cols-3 divide-x divide-zinc-200 border-t border-emerald-200 bg-white text-center">
              <div className="px-2 py-3">
                <dt className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
                  {labels.correctCount}
                </dt>
                <dd className="text-lg font-semibold text-emerald-700">
                  {result.correct}
                </dd>
              </div>
              <div className="px-2 py-3">
                <dt className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
                  {labels.incorrectCount}
                </dt>
                <dd className="text-lg font-semibold text-red-700">
                  {result.incorrect}
                </dd>
              </div>
              <div className="px-2 py-3">
                <dt className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
                  {labels.unansweredCount}
                </dt>
                <dd className="text-lg font-semibold text-zinc-700">
                  {result.unanswered}
                </dd>
              </div>
            </dl>

            <p className="border-t border-emerald-200 bg-white px-5 py-2 text-xs text-zinc-500">
              {labels.gradeScaleHint}
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/60 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="font-medium text-zinc-700">
                {labels.answered}: {answeredCount} / {exam.questions.length}
              </p>
              {mode === "exam" ? (
                <p className="text-xs text-zinc-500">
                  {labels.finalDurationHint}
                </p>
              ) : null}
            </div>
            <div
              role="progressbar"
              aria-label={labels.answered}
              aria-valuemin={0}
              aria-valuemax={questionTotal}
              aria-valuenow={answeredCount}
              className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200"
            >
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{
                  width: `${(answeredCount / questionTotal) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>


      <ol className="space-y-4">
        {exam.questions.map((question, index) => {
          const answer = answers[index] ?? createQuestionAnswer(question);
          const format = practiceFormatOf(question);
          const isCorrect = results[index] === true;
          const complete = isAnswerComplete(question, answer);

          return (
            <li
              key={`${exam.id}-${index}`}
              data-question-id={`${exam.id}-${index + 1}`}
              data-result={
                submitted ? (isCorrect ? "correct" : "incorrect") : undefined
              }
              className="rounded-2xl border border-zinc-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <span className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  {practiceLabels.questionUnit}
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
                  {practiceLabels.formats[format]}
                </span>
                {question.difficulty ? (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                    {question.difficulty}
                  </span>
                ) : null}
                {!submitted && complete ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    ✓ {labels.answered}
                  </span>
                ) : null}
              </div>

              <QuestionAnswerInput
                question={question}
                answer={answer}
                onChange={(patch) => updateAnswer(index, patch)}
                labels={practiceLabels}
                reveal={submitted}
                disabled={submitted}
              />

              {submitted ? (
                <QuestionFeedback
                  question={question}
                  labels={practiceLabels}
                  isCorrect={isCorrect}
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-800">
            {labels.answered}: {answeredCount} / {exam.questions.length}
          </p>
          {mode === "exam" ? (
            <p className="font-mono text-xs text-zinc-500 tabular-nums">
              {labels.timeLeft}: {formatCountdown(secondsLeft)}
            </p>
          ) : null}
        </div>

        {submitted ? (
          <div className="flex flex-wrap items-center gap-2">
            {mode === "practice" ? (
              <button
                type="button"
                onClick={resetAttempt}
                className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900"
              >
                {labels.retry}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onExit}
              className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              {mode === "practice" ? labels.backToPractice : labels.newExam}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => submit(false)}
            className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            {labels.submit}
          </button>
        )}
      </div>
    </section>
  );
}

