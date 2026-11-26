"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CurriculumContent } from "@/components/curriculum-sections";
import { ExamRunner } from "@/components/exam-runner";
import { FinalExamPanel } from "@/components/final-exam-panel";
import { PracticeCenter } from "@/components/practice-center";
import type { ParsedCurriculum } from "@/lib/curriculum";
import type { GeneratedExam } from "@/lib/exam";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/locales";
import type { PracticeFormat } from "@/lib/practice";
import { useChapterProgress } from "@/lib/use-chapter-progress";

export type LearningChapter = {
  id: string;
  position: number;
  title: string;
  fileName: string;
  pages: number | null;
  /** Pre-formatted on the server so client and server agree on the date. */
  uploadedAt: string;
  truncated: boolean;
  curriculum: ParsedCurriculum;
};

type LearningTab = "content" | "practice";

/**
 * Subject workspace: chapter list + progress on the left, chapter content and
 * the practice center on the right. Progress is stored per browser via
 * `useChapterProgress`, so marking a chapter as learned survives reloads.
 */
export function SubjectLearning({
  subjectId,
  lang,
  chapters,
  uploadHref,
  dict,
  initialChapterId,
  initialTab = "content",
  initialFormat,
  initialExam,
}: {
  subjectId: string;
  lang: Locale;
  chapters: LearningChapter[];
  uploadHref: string;
  dict: Dictionary;
  /** Deep link support: `?chapter=<document id>`. */
  initialChapterId?: string;
  initialTab?: LearningTab;
  /** Deep link support: `?format=<practice format>`. */
  initialFormat?: PracticeFormat;
  /** Deep link support: `?exam=<id>` (resume a generated paper). */
  initialExam?: GeneratedExam;
}) {
  const [activeChapterId, setActiveChapterId] = useState(
    initialChapterId ?? chapters[0].id,
  );
  const [tab, setTab] = useState<LearningTab>(initialTab);
  const [view, setView] = useState<"chapter" | "final">(
    initialExam?.kind === "final" ? "final" : "chapter",
  );
  const [activeExam, setActiveExam] = useState<GeneratedExam | null>(
    initialExam ?? null,
  );
  const progress = useChapterProgress(
    `studygap:subject-progress:${subjectId}`,
  );

  // Keep `?exam=` in the URL so a reload resumes the current paper. The other
  // query params (chapter/tab/format) stay untouched.
  useEffect(() => {
    const url = new URL(window.location.href);

    if (activeExam) {
      url.searchParams.set("exam", activeExam.id);
    } else {
      url.searchParams.delete("exam");
    }

    window.history.replaceState(null, "", url.toString());
  }, [activeExam]);

  const activeChapter =
    chapters.find((chapter) => chapter.id === activeChapterId) ?? chapters[0];
  const completedCount = chapters.filter((chapter) =>
    progress.isComplete(chapter.id),
  ).length;
  const percent = Math.round((completedCount / chapters.length) * 100);
  const isActiveDone = progress.isComplete(activeChapter.id);

  function showChapter(chapterId: string) {
    setActiveChapterId(chapterId);
    setActiveExam(null);
    setView("chapter");
  }

  function openExam(exam: GeneratedExam) {
    setActiveExam(exam);

    if (exam.kind === "final") {
      setView("final");
    } else {
      setView("chapter");
      setTab("practice");
    }
  }

  function closeExam() {
    if (activeExam?.kind === "final") {
      setActiveExam(null);
      setView("final");
      return;
    }

    setActiveExam(null);
    setView("chapter");
    setTab("practice");
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
      <aside
        className="min-w-0 lg:sticky lg:top-20 lg:flex lg:max-h-[calc(100vh-6rem)] lg:flex-col"
        aria-label={dict.subject.learningPath}
      >
        {/* Progress card: never scrolls, keeps a fixed height inside the column. */}
        <div className="shrink-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-900">
              {dict.subject.progressLabel}
            </p>
            <span className="text-xs font-semibold text-emerald-700">
              {completedCount} / {chapters.length}
            </span>
          </div>

          <div
            role="progressbar"
            aria-label={dict.subject.progressLabel}
            aria-valuemin={0}
            aria-valuemax={chapters.length}
            aria-valuenow={completedCount}
            className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100"
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>

          <p className="mt-2 text-xs text-zinc-500">
            {completedCount} / {chapters.length} {dict.subject.chapterUnit}
          </p>

          {completedCount > 0 ? (
            <button
              type="button"
              onClick={progress.reset}
              className="mt-3 text-xs font-semibold text-zinc-500 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-zinc-800"
            >
              {dict.subject.resetProgress}
            </button>
          ) : null}
        </div>

        {/*
         * Only the chapter list scrolls. Because the sticky column is capped at
         * the viewport height, a long list shrinks (`min-h-0`) and scrolls here
         * instead of pushing the pinned footer below the fold. The list is not
         * allowed to grow, so short lists keep the card hugging its content.
         * Below `lg` the column is not sticky, so the list gets its own cap.
         */}
        <nav
          aria-label={dict.subject.chapterListLabel}
          className="mt-4 max-h-[60vh] min-h-0 shrink overflow-x-hidden overflow-y-auto rounded-2xl border border-zinc-200 bg-white pr-2 shadow-sm lg:max-h-none"
        >
          <p className="border-b border-zinc-100 px-4 py-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            {dict.subject.chapterListLabel}
          </p>
          <ol className="divide-y divide-zinc-100">
            {chapters.map((chapter) => {
              const isActive = chapter.id === activeChapter.id;
              const isDone = progress.isComplete(chapter.id);

              return (
                <li
                  key={chapter.id}
                  data-chapter-id={chapter.id}
                  data-active={isActive ? "true" : undefined}
                  className={`flex items-stretch gap-1 ${
                    isActive ? "bg-emerald-50/60" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => showChapter(chapter.id)}
                    aria-current={isActive ? "true" : undefined}
                    className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left"
                  >
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                        isDone
                          ? "bg-emerald-600 text-white"
                          : isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {isDone ? "✓" : chapter.position}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-zinc-900">
                        {chapter.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {chapter.curriculum.questions.length}{" "}
                        {dict.practice.questionsUnit}
                      </span>
                    </span>
                  </button>

                  <label
                    className="flex w-10 shrink-0 cursor-pointer items-center justify-center"
                    title={
                      isDone ? dict.subject.markUndone : dict.subject.markDone
                    }
                  >
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => progress.toggle(chapter.id)}
                      aria-label={`${dict.subject.markDone}: ${chapter.title}`}
                      className="h-4 w-4 cursor-pointer accent-emerald-600"
                    />
                  </label>
                </li>
              );
            })}
          </ol>
        </nav>

        {/*
         * Pinned footer: the final-exam entry and the upload shortcut sit at the
         * bottom of the column and are always reachable, outside the scroll box.
         */}
        <div className="shrink-0">
          <button
            type="button"
            data-final-exam
            data-active={
              !activeExam && view === "final" ? "true" : undefined
            }
            onClick={() => {
              setActiveExam(null);
              setView("final");
            }}
            aria-current={!activeExam && view === "final" ? "true" : undefined}
            className={`mt-4 flex w-full items-start gap-3 rounded-2xl border p-4 text-left shadow-sm transition ${
              !activeExam && view === "final"
                ? "border-emerald-300 bg-emerald-50/70 ring-1 ring-emerald-300"
                : "border-zinc-200 bg-white hover:border-emerald-300"
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-semibold ${
                !activeExam && view === "final"
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              🎓
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-zinc-900">
                {dict.exam.finalNavLabel}
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
                {dict.exam.finalNavHint}
              </span>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                {chapters.length} {dict.subject.chapterUnit}
              </span>
            </span>
          </button>

          <Link
            href={uploadHref}
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition-colors hover:border-emerald-300 hover:bg-emerald-100"
          >
            {dict.subject.uploadMore}
          </Link>
        </div>
      </aside>

      <div className="min-w-0">
        {activeExam ? (
          <ExamRunner
            key={activeExam.id}
            exam={activeExam}
            labels={dict.exam}
            practiceLabels={dict.practice}
            locale={lang}
            onExit={closeExam}
          />
        ) : view === "final" ? (
          <FinalExamPanel
            subjectId={subjectId}
            lang={lang}
            chapters={chapters.map((chapter) => ({
              id: chapter.id,
              title: chapter.title,
            }))}
            labels={dict.exam}
            onExamReady={openExam}
          />
        ) : (
          <>
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-100">
                {dict.subject.chapterUnit} {activeChapter.position}
              </span>
              {activeChapter.pages !== null ? (
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">
                  {activeChapter.pages} {dict.subject.pagesUnit}
                </span>
              ) : null}
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">
                {activeChapter.curriculum.questions.length}{" "}
                {dict.practice.questionsUnit}
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              {activeChapter.title}
            </h2>
            <p className="mt-1 truncate text-xs text-zinc-500">
              {activeChapter.fileName}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {dict.subject.uploadedAt} {activeChapter.uploadedAt}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => progress.toggle(activeChapter.id)}
                aria-pressed={isActiveDone}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
                  isActiveDone
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                <span aria-hidden="true">{isActiveDone ? "✓" : "○"}</span>
                {isActiveDone ? dict.subject.markUndone : dict.subject.markDone}
              </button>
              <button
                type="button"
                onClick={() => setTab("practice")}
                className="text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-900"
              >
                {dict.subject.practiceTab} →
              </button>
            </div>

            {activeChapter.truncated ? (
              <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                {dict.subject.truncatedNote}
              </p>
            ) : null}
          </section>

          <div
            role="tablist"
            aria-label={dict.subject.learningPath}
            className="mt-5 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-sm"
          >
            {(
              [
                ["content", dict.subject.contentTab],
                ["practice", dict.subject.practiceTab],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                id={`learning-tab-${value}`}
                aria-selected={tab === value}
                aria-controls={`learning-panel-${value}`}
                onClick={() => setTab(value)}
                className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors ${
                  tab === value
                    ? "bg-emerald-600 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {label}
                {value === "practice" ? (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                      tab === value
                        ? "bg-white/20 text-white"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {activeChapter.curriculum.questions.length}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id={`learning-panel-${tab}`}
            aria-labelledby={`learning-tab-${tab}`}
            className="mt-5"
          >
            {tab === "content" ? (
              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
                <CurriculumContent
                  curriculum={activeChapter.curriculum}
                  labels={dict.curriculum}
                  showQuestions={false}
                />

                <div className="mt-8 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-4">
                  <p className="text-sm font-semibold text-emerald-900">
                    {dict.practice.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    {dict.practice.intro}
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab("practice")}
                    className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    {dict.subject.practiceTab}
                  </button>
                </div>
              </section>
            ) : (
              <PracticeCenter
                key={activeChapter.id}
                questions={activeChapter.curriculum.questions}
                labels={dict.practice}
                examLabels={dict.exam}
                initialFormat={initialFormat}
                subjectId={subjectId}
                chapterId={activeChapter.id}
                lang={lang}
                onExamReady={openExam}
              />
            )}
          </div>
          </>
        )}
      </div>
    </div>
  );
}

