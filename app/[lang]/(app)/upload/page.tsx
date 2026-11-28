import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUserId } from "@/lib/current-user";
import { getDictionary } from "@/lib/i18n";
import { defaultLocale, hasLocale } from "@/lib/locales";
import { listSubjectProfiles } from "@/lib/subject-catalog";
import { UploadForm, type SubjectOption } from "./upload-form";

type UploadPageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ subject?: string | string[] }>;
};

export async function generateMetadata({
  params,
}: UploadPageProps): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;

  return { title: getDictionary(locale).upload.metaTitle };
}

/**
 * Cache Components: `searchParams` and the session are request data, so both are
 * read behind the Suspense boundary above (same pattern as the subject page).
 */
export default function UploadPage({ params, searchParams }: UploadPageProps) {
  return (
    <Suspense fallback={<UploadPageSkeleton />}>
      <UploadPageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function UploadPageSkeleton() {
  return (
    <div
      aria-busy="true"
      className="mx-auto w-full max-w-5xl flex-1 animate-pulse px-6 py-12 sm:py-16"
    >
      <div className="h-4 w-40 rounded bg-zinc-200/80" />
      <div className="mt-6 h-10 w-72 rounded bg-zinc-200/80" />
      <div className="mt-8 h-52 rounded-2xl border border-zinc-200 bg-white" />
    </div>
  );
}

async function UploadPageContent({ params, searchParams }: UploadPageProps) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const { subject } = await searchParams;
  const requested = Array.isArray(subject) ? subject[0] : subject;
  const dict = getDictionary(lang);

  // Localised subject picker; `?subject=` preselects the subject the user came
  // from ("upload more" on a subject page or a freshly created subject).
  // `listSubjectProfiles` merges the static catalogue with the user's own rows.
  const userId = await getCurrentUserId();
  const profiles = await listSubjectProfiles(userId);
  const subjectOptions: SubjectOption[] = profiles.map((item) => ({
    id: item.id,
    name: item.name[lang],
    code: item.code,
  }));
  const initialSubjectId =
    subjectOptions.find((option) => option.id === requested)?.id ??
    subjectOptions[0]?.id ??
    "";

  return (
    <UploadForm
      lang={lang}
      dict={dict}
      subjects={subjectOptions}
      initialSubjectId={initialSubjectId}
    />
  );
}

