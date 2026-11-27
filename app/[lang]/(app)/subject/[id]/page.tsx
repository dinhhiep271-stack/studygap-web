import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  SubjectLearning,
  type LearningChapter,
} from "@/components/subject-learning";
import { buildChapters } from "@/lib/chapters";
import { getCurrentUserId } from "@/lib/current-user";
import { getExam } from "@/lib/exam-service";
import { getDictionary } from "@/lib/i18n";
import { hasLocale, otherLocale } from "@/lib/locales";
import { isPracticeFormat } from "@/lib/practice";
import {
  documentsForLocale,
  getSubjectDocuments,
} from "@/lib/subject-documents";
import { getSubject } from "@/lib/subjects";

type SubjectPageProps = {
  params: Promise<{ lang: string; id: string }>;
  searchParams: Promise<{
    chapter?: string | string[];
    tab?: string | string[];
    format?: string | string[];
    exam?: string | string[];
  }>;
};

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: Pick<SubjectPageProps, "params">): Promise<Metadata> {
  const { lang, id } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const subject = getSubject(id);

  // Resolve the 404 before the response starts streaming so it gets a 404 status.
  if (!subject) {
    notFound();
  }

  return {
    title: subject.name[lang],
    description: subject.summary[lang],
  };
}

/**
 * Cache Components / Partial Prefetching: the `id` segment is URL data, so it
 * has to be read behind a Suspense boundary. Reading it in the page shell would
 * tie the shared App Shell to one URL ("URL data outside of Suspense").
 */
export default function SubjectPage({ params, searchParams }: SubjectPageProps) {
  return (
    <Suspense fallback={<SubjectPageSkeleton />}>
      <SubjectDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function SubjectPageSkeleton() {
  return (
    <div
      aria-busy="true"
      className="mx-auto w-full max-w-5xl flex-1 animate-pulse px-6 py-12 sm:py-16"
    >
      <div className="h-4 w-40 rounded bg-zinc-200/80" />
      <div className="mt-5 h-52 rounded-2xl border border-zinc-200 bg-white" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="h-32 rounded-2xl border border-zinc-200 bg-white" />
          <div className="h-72 rounded-2xl border border-zinc-200 bg-white" />
        </div>
        <div className="h-96 rounded-2xl border border-zinc-200 bg-white" />
      </div>
    </div>
  );
}

async function SubjectDetail({ params, searchParams }: SubjectPageProps) {
  const { lang, id } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const subject = getSubject(id);

  if (!subject) {
    notFound();
  }

  const dict = getDictionary(lang);
  const secondaryLang = otherLocale(lang);
  const uploadHref = `/${lang}/upload?subject=${subject.id}`;
  const dateFormatter = new Intl.DateTimeFormat(lang, { dateStyle: "medium" });

  // Teaching is bilingual (`summary_de`/`summary_vi`,
  // `concepts_de`/`concepts_vi`), so every document that carries the active
  // locale is shown – regardless of the language selected at upload time.
  // Legacy documents (single-language teaching) stay limited to the language
  // they were generated in; the hint below counts those hidden rows. Every query
  // is scoped to the signed-in user, so two accounts never share chapters,
  // language hints or stored exams.
  const userId = await getCurrentUserId();
  const requestedExamId = firstValue(query.exam);
  const [storedDocuments, storedExam] = await Promise.all([
    getSubjectDocuments(userId, id),
    requestedExamId ? getExam(userId, requestedExamId) : Promise.resolve(null),
  ]);
  const documents = documentsForLocale(storedDocuments, lang);
  const otherLanguageCount = storedDocuments.length - documents.length;

  // Deep link `?exam=<id>`: only a paper of this subject in this language is
  // resumed, otherwise the page falls back to the chapter workspace.
  const initialExam =
    storedExam &&
    storedExam.subjectId === subject.id &&
    storedExam.language === lang &&
    storedExam.questions.length > 0
      ? storedExam
      : undefined;

  const chapters: LearningChapter[] = buildChapters(documents).map(
    (chapter) => ({
      id: chapter.id,
      position: chapter.position,
      title: chapter.title,
      fileName: chapter.fileName,
      pages: chapter.pages,
      uploadedAt: dateFormatter.format(chapter.createdAt),
      truncated: chapter.truncated,
      curriculum: chapter.curriculum,
    }),
  );

  // Deep links: ?chapter=<document id>&tab=practice&format=<practice format>
  const requestedChapterId = firstValue(query.chapter);
  const initialChapterId = chapters.some(
    (chapter) => chapter.id === requestedChapterId,
  )
    ? requestedChapterId
    : undefined;
  const requestedFormat = firstValue(query.format);
  const initialFormat = isPracticeFormat(requestedFormat)
    ? requestedFormat
    : undefined;
  const initialTab =
    firstValue(query.tab) === "practice" ? "practice" : "content";

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:py-16">
      <nav
        aria-label={dict.subject.breadcrumbLabel}
        className="text-sm text-zinc-500"
      >
        <Link
          href={`/${lang}`}
          className="font-medium text-zinc-600 hover:text-zinc-900"
        >
          {dict.subject.home}
        </Link>
        <span aria-hidden="true" className="px-2">
          /
        </span>
        <span className="text-zinc-900">{subject.name[lang]}</span>
      </nav>

      <header className="mt-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-emerald-700">
          {dict.subject.learningPath}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-100">
            {subject.code}
          </span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">
            {subject.semester[lang]}
          </span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">
            {chapters.length} {dict.subject.chapterUnit}
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          {subject.name[lang]}
        </h1>
        <p lang={secondaryLang} className="mt-1 text-lg font-medium text-zinc-500">
          {subject.name[secondaryLang]}
        </p>
        <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">
          {subject.summary[lang]}
        </p>
        <p className="mt-1 text-sm text-zinc-500">{dict.subject.learningHint}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={uploadHref}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            {dict.subject.uploadMore}
          </Link>
          <Link
            href={`/${lang}`}
            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900"
          >
            {dict.subject.allSubjects}
          </Link>
        </div>
      </header>

      {chapters.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">
            {dict.subject.documentsTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-600">
            {dict.subject.documentsEmpty}
          </p>
          <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-zinc-500">
            {dict.subject.documentsHint}
          </p>
          <Link
            href={uploadHref}
            className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            {dict.subject.uploadMore}
          </Link>
        </section>
      ) : (
        <SubjectLearning
          subjectId={subject.id}
          lang={lang}
          chapters={chapters}
          uploadHref={uploadHref}
          dict={dict}
          initialChapterId={initialChapterId}
          initialTab={initialTab}
          initialFormat={initialFormat}
          initialExam={initialExam}
        />
      )}

      {otherLanguageCount > 0 ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          {dict.subject.languageFallback}
        </p>
      ) : null}
    </div>
  );
}

