import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { hasLocale, otherLocale } from "@/lib/locales";
import { subjects } from "@/lib/subjects";

type HomePageProps = {
  params: Promise<{ lang: string }>;
};

function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="h-4 w-4"
    >
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
    >
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

export default async function HomePage({ params }: HomePageProps) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dict = getDictionary(lang);
  const secondaryLang = otherLocale(lang);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:py-16">
      <section className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">{dict.home.term}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            {dict.home.title}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-zinc-600">
            {dict.home.intro}
          </p>
        </div>
        <Link
          href={`/${lang}/upload`}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          <PlusIcon />
          {dict.home.addSubject}
        </Link>
      </section>

      <section
        aria-label={dict.home.listLabel}
        className="mt-10 grid gap-4 sm:grid-cols-2"
      >
        {subjects.map((subject, index) => (
          <Link
            key={subject.id}
            href={`/${lang}/subject/${subject.id}`}
            className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                {subject.semester[lang]}
              </span>
            </div>

            <h2 className="mt-4 text-lg font-semibold tracking-tight text-zinc-900">
              {subject.name[lang]}
            </h2>
            <p
              lang={secondaryLang}
              className="mt-1 text-sm font-medium text-zinc-500"
            >
              {subject.name[secondaryLang]}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {subject.summary[lang]}
            </p>

            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-6 text-xs font-medium text-zinc-500">
              <span>{subject.code}</span>
              <span className="ml-auto inline-flex items-center gap-1.5 text-emerald-700">
                {dict.home.enter}
                <ArrowIcon />
              </span>
            </div>
          </Link>
        ))}
      </section>

      <p className="mt-8 text-sm text-zinc-500">
        {subjects.length} {dict.home.subjectsUnit}
      </p>
    </div>
  );
}
