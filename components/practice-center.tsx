"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  QuestionAnswerInput,
  QuestionFeedback,
} from "@/components/question-input";
import { Spinner } from "@/components/spinner";
import type { CurriculumQuestion } from "@/lib/curriculum";
import {
  chapterQuestionLimit,
  clampQuestionCount,
  examErrorMessage,
  type GeneratedExam,
} from "@/lib/exam";
import { createExam, ExamRequestError } from "@/lib/exam-client";
import type { Dictionary } from "@/lib/i18n";
import {
  countQuestionsByFormat,
  createQuestionAnswer,
  gradeQuestion,
  isAnswerComplete,
  practiceFormats,
  questionsForFormat,
  type PracticeFormat,
  type QuestionAnswer,
} from "@/lib/practice";

type PracticeLabels = Dictionary["practice"];
type ExamLabels = Dictionary["exam"];

const formatGlyphs: Record<PracticeFormat, string> = {
  single_choice: "1",
  multiple_response: "n",
  calculation: "=",
  fill_in_the_blank: "_",
  true_false: "✓",
  table: "▦",
};

/**
 * Practice center for one chapter: learn with the stored question bank or let
 * the AI create a brand-new paper ("Tạo đề mới"), filter by exercise format,
 * answer the questions and reveal the solution + explanation with "check".
 */
export function PracticeCenter({
  questions,
  labels,
  examLabels,
  initialFormat,
  subjectId,
  chapterId,
  lang,
  onExamReady,
}: {
  questions: CurriculumQuestion[];
  labels: PracticeLabels;
  examLabels: ExamLabels;
  /** Deep link (`?format=…`); ignored when the chapter has no such questions. */
  initialFormat?: PracticeFormat;
  subjectId: string;
  chapterId: string;
  lang: string;
  /** Opens the generated paper in the untimed practice runner. */
  onExamReady: (exam: GeneratedExam) => void;
}) {
  const counts = useMemo(() => countQuestionsByFormat(questions), [questions]);
  const [format, setFormat] = useState<PracticeFormat>(() => {
    if (initialFormat && counts[initialFormat] > 0) {
      return initialFormat;
    }

    return practiceFormats.find((item) => counts[item] > 0) ?? "single_choice";
  });
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});

  // AI generator state ("Tạo đề mới").
  const [count, setCount] = useState(String(chapterQuestionLimit.default));
  const [generating, setGenerating] = useState(false);
  const [generatorError, setGeneratorError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!generating) {
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [generating]);

  // Abort a running generation when the chapter/tab is left.
  useEffect(() => () => abortRef.current?.abort(), []);

  const activeQuestions = useMemo(
    () => questionsForFormat(questions, format),
    [questions, format],
  );

  const graded = Object.keys(results).length;
  const correct = Object.values(results).filter(Boolean).length;

  function selectFormat(next: PracticeFormat) {
    setFormat(next);
    setResults({});
  }

  async function handleGenerate() {
    if (generating) {
      return;
    }

    const requested = clampQuestionCount("chapter", Number(count));
    setCount(String(requested));
    setGeneratorError(null);
    setElapsed(0);

    const controller = new AbortController();
    abortRef.current = controller;
    setGenerating(true);

    try {
      const exam = await createExam(
        {
          subjectId,
          chapterId,
          kind: "chapter",
          count: requested,
          lang,
        },
        controller.signal,
      );


      onExamReady(exam);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      setGeneratorError(
        examErrorMessage(
          examLabels.errors,
          error instanceof ExamRequestError ? error.code : "upstream",
        ),
      );
    } finally {
      abortRef.current = null;
      setGenerating(false);
      setElapsed(0);
    }
  }
  return (
    <section
      data-practice-format={format}
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
            {labels.title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            {labels.intro}
          </p>
        </div>
        {graded > 0 ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-2">
            <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">
              {labels.scoreLabel}
            </p>
            <p className="text-lg font-semibold text-emerald-900">
              {correct} / {graded}
            </p>
          </div>
        ) : null}
      </div>

      <div
        data-exam-generator
        className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-900">
              {examLabels.generatorTitle}
            </p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-emerald-800">
              {examLabels.generatorIntro}
            </p>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold tracking-wide text-emerald-700 uppercase ring-1 ring-emerald-200">
            AI
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="block text-xs font-semibold tracking-wide text-emerald-900 uppercase">
              {examLabels.countLabel}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={chapterQuestionLimit.min}
              max={chapterQuestionLimit.max}
              value={count}
              disabled={generating}
              onChange={(event) => setCount(event.target.value)}
              className="mt-1 h-11 w-28 rounded-xl border border-emerald-300 bg-white px-3 text-sm font-semibold text-zinc-900 focus:border-emerald-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500"
            />
          </label>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-400"
          >
            {generating ? (
              <>
                <Spinner className="h-4 w-4" />
                {examLabels.generating}
              </>
            ) : (
              examLabels.generate
            )}
          </button>

          {generating ? (
            <span className="pb-3 font-mono text-xs font-medium text-emerald-700 tabular-nums">
              {elapsed}s
            </span>
          ) : null}
        </div>

        <p className="mt-2 text-xs leading-5 text-emerald-700">
          {examLabels.countHint} {examLabels.generateHint}
        </p>

        {generatorError ? (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-700 ring-1 ring-red-200"
          >
            {generatorError}
          </p>
        ) : null}
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          {labels.chooseFormat}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {practiceFormats.map((item) => {
            const isActive = item === format;
            const itemCount = counts[item];

            return (
              <button
                key={item}
                type="button"
                onClick={() => selectFormat(item)}
                aria-pressed={isActive}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                  isActive
                    ? "border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500"
                    : itemCount > 0
                      ? "border-zinc-200 bg-white hover:border-emerald-300 hover:shadow-sm"
                      : "border-dashed border-zinc-200 bg-zinc-50/60"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {formatGlyphs[item]}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold text-zinc-900">
                      {labels.formats[item]}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-600">
                      {itemCount}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
                    {labels.hints[item]}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeQuestions.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 px-4 py-6 text-sm leading-6 text-zinc-500">
          {labels.emptyFormat}
        </p>
      ) : (
        <ol className="mt-6 space-y-4">
          {activeQuestions.map((question, index) => {
            const questionKey = `${format}:${question.id}:${index}`;
            const answer =
              answers[questionKey] ?? createQuestionAnswer(question);
            const checked = Object.hasOwn(results, questionKey);

            return (
              <PracticeQuestion
                key={questionKey}
                question={question}
                format={format}
                position={index + 1}
                labels={labels}
                answer={answer}
                checked={checked}
                isCorrect={checked && results[questionKey] === true}
                onChange={(patch) =>
                  setAnswers((previous) => {
                    const current =
                      previous[questionKey] ??
                      createQuestionAnswer(question);

                    return {
                      ...previous,
                      [questionKey]: { ...current, ...patch },
                    };
                  })
                }
                onCheck={() =>
                  setResults((previous) => ({
                    ...previous,
                    [questionKey]: gradeQuestion(question, answer),
                  }))
                }
                onRetry={() => {
                  setAnswers((previous) => ({
                    ...previous,
                    [questionKey]: createQuestionAnswer(question),
                  }));
                  setResults((previous) => {
                    const next = { ...previous };
                    delete next[questionKey];
                    return next;
                  });
                }}
              />
            );
          })}
        </ol>
      )}
    </section>
  );
}


function PracticeQuestion({
  question,
  format,
  position,
  labels,
  answer,
  checked,
  isCorrect,
  onChange,
  onCheck,
  onRetry,
}: {
  question: CurriculumQuestion;
  format: PracticeFormat;
  position: number;
  labels: PracticeLabels;
  answer: QuestionAnswer;
  checked: boolean;
  isCorrect: boolean;
  onChange: (patch: Partial<QuestionAnswer>) => void;
  onCheck: () => void;
  onRetry: () => void;
}) {
  const isChoice =
    format === "single_choice" || format === "multiple_response";
  const canCheck = isAnswerComplete(question, answer);

  return (
    <li
      data-question-id={question.id}
      className="rounded-2xl border border-zinc-200 bg-white p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-xs font-semibold text-white">
          {position}
        </span>
        <span className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          {labels.questionUnit}
        </span>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
          {labels.formats[format]}
        </span>
        {question.difficulty ? (
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
            {question.difficulty}
          </span>
        ) : null}
      </div>

      <QuestionAnswerInput
        question={question}
        answer={answer}
        onChange={onChange}
        labels={labels}
        reveal={checked}
        disabled={checked}
      />

      {checked ? (
        <QuestionFeedback
          question={question}
          labels={labels}
          isCorrect={isCorrect}
        />
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {checked ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900"
          >
            {labels.retry}
          </button>
        ) : (
          <button
            type="button"
            onClick={onCheck}
            disabled={!canCheck}
            className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {labels.check}
          </button>
        )}
        {!checked && isChoice ? (
          <span className="text-xs text-zinc-500">{labels.selectHint}</span>
        ) : null}
      </div>
    </li>
  );
}

