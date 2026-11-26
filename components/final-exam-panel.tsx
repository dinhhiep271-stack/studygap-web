"use client";

import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/spinner";
import {
  clampExamDuration,
  clampQuestionCount,
  defaultExamDuration,
  examDurations,
  examErrorMessage,
  finalQuestionLimit,
  type GeneratedExam,
} from "@/lib/exam";
import { createExam, ExamRequestError } from "@/lib/exam-client";
import type { Dictionary } from "@/lib/i18n";

type ExamLabels = Dictionary["exam"];

/**
 * Setup screen for the final exam: pick question count and duration, then let
 * the AI build one paper from every chapter of the subject. The generated exam is
 * handed to `ExamRunner`, which owns the timer, auto-submit and grading.
 */
export function FinalExamPanel({
  subjectId,
  lang,
  chapters,
  labels,
  onExamReady,
}: {
  subjectId: string;
  lang: string;
  chapters: { id: string; title: string }[];
  labels: ExamLabels;
  onExamReady: (exam: GeneratedExam) => void;
}) {
  const [count, setCount] = useState(String(finalQuestionLimit.default));
  const [duration, setDuration] = useState(defaultExamDuration);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleStart() {
    if (generating || chapters.length === 0) {
      return;
    }

    const requestedCount = clampQuestionCount("final", Number(count));
    const requestedDuration = clampExamDuration(duration);

    setCount(String(requestedCount));
    setDuration(requestedDuration);
    setError(null);
    setElapsed(0);

    const controller = new AbortController();
    abortRef.current = controller;
    setGenerating(true);

    try {
      const exam = await createExam(
        {
          subjectId,
          kind: "final",
          count: requestedCount,
          durationMinutes: requestedDuration,
          lang,
        },
        controller.signal,
      );

      onExamReady(exam);
    } catch (requestError) {
      if (
        requestError instanceof Error &&
        requestError.name === "AbortError"
      ) {
        return;
      }

      setError(
        examErrorMessage(
          labels.errors,
          requestError instanceof ExamRequestError
            ? requestError.code
            : "upstream",
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
      data-final-exam-panel
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <p className="text-sm font-medium text-emerald-700">
        {labels.finalNavLabel}
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
        {labels.finalTitle}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
        {labels.finalIntro}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-medium">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-100">
          {labels.finalScope}
        </span>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">
          {chapters.length}
        </span>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">
          {labels.finalDurationLabel}: {duration} min
        </span>
      </div>

      {chapters.length === 0 ? (
        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          {labels.finalNoChapters}
        </p>
      ) : (
        <>
          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              {labels.finalChapters}
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {chapters.map((chapter) => (
                <li
                  key={chapter.id}
                  className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200"
                >
                  {chapter.title}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="block text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                {labels.finalCountLabel}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={finalQuestionLimit.min}
                max={finalQuestionLimit.max}
                value={count}
                disabled={generating}
                onChange={(event) => setCount(event.target.value)}
                className="mt-1 h-11 w-full max-w-32 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 focus:border-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500"
              />
              <span className="mt-1 block text-xs text-zinc-500">
                {finalQuestionLimit.min}–{finalQuestionLimit.max}
              </span>
            </label>

            <div>
              <span className="block text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                {labels.finalDurationLabel}
              </span>
              <div className="mt-1 flex flex-wrap gap-2">
                {examDurations.map((minutes) => {
                  const isActive = minutes === duration;

                  return (
                    <button
                      key={minutes}
                      type="button"
                      disabled={generating}
                      aria-pressed={isActive}
                      onClick={() => setDuration(minutes)}
                      className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition ${
                        isActive
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                          : "border-zinc-300 bg-white text-zinc-700 hover:border-emerald-300"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {minutes} min
                    </button>
                  );
                })}
              </div>
              <span className="mt-1 block text-xs text-zinc-500">
                {labels.finalDurationHint}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleStart}
              disabled={generating}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-400"
            >
              {generating ? (
                <>
                  <Spinner className="h-4 w-4" />
                  {labels.finalStarting}
                </>
              ) : (
                labels.finalStart
              )}
            </button>

            {generating ? (
              <span className="font-mono text-xs font-medium text-emerald-700 tabular-nums">
                {elapsed}s
              </span>
            ) : null}

            <p className="text-xs leading-5 text-zinc-500">
              {labels.finalHint}
            </p>
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-700 ring-1 ring-red-200"
            >
              {error}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
