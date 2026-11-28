import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getDictionary } from "@/lib/i18n";
import { defaultLocale, hasLocale } from "@/lib/locales";
import { SubjectForm } from "./subject-form";

type NewSubjectPageProps = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({
  params,
}: NewSubjectPageProps): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;

  return { title: getDictionary(locale).newSubject.metaTitle };
}

/**
 * Cache Components: `params` is URL data, so it is read behind a Suspense
 * boundary (same pattern as the upload and subject pages). The static segment
 * `new` wins over `subject/[id]`, so `/de/subject/new` is never treated as a
 * subject slug.
 */
export default function NewSubjectPage({ params }: NewSubjectPageProps) {
  return (
    <Suspense fallback={<NewSubjectSkeleton />}>
      <NewSubjectContent params={params} />
    </Suspense>
  );
}

function NewSubjectSkeleton() {
  return (
    <div
      aria-busy="true"
      className="mx-auto w-full max-w-3xl flex-1 animate-pulse px-6 py-12 sm:py-16"
    >
      <div className="h-4 w-40 rounded bg-zinc-200/80" />
      <div className="mt-6 h-10 w-72 rounded bg-zinc-200/80" />
      <div className="mt-8 h-64 rounded-2xl border border-zinc-200 bg-white" />
    </div>
  );
}

async function NewSubjectContent({ params }: NewSubjectPageProps) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dict = getDictionary(lang);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:py-16">
      <Link
        href={`/${lang}`}
        className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        {dict.newSubject.back}
      </Link>

      <header className="mt-5">
        <p className="text-sm font-medium text-emerald-700">
          {dict.newSubject.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          {dict.newSubject.title}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">
          {dict.newSubject.intro}
        </p>
      </header>

      <SubjectForm lang={lang} dict={dict} />
    </div>
  );
}
