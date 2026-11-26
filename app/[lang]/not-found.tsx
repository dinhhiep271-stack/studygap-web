import Link from "next/link";
import { lang as getLang } from "next/root-params";
import { getDictionary } from "@/lib/i18n";
import { defaultLocale, hasLocale } from "@/lib/locales";

export default async function NotFound() {
  const current = await getLang();
  const locale = hasLocale(current) ? current : defaultLocale;
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-sm font-semibold text-emerald-700">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
        {dict.notFound.title}
      </h1>
      <p className="mt-3 max-w-md text-base leading-7 text-zinc-600">
        {dict.notFound.description}
      </p>
      <Link
        href={`/${locale}`}
        className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-emerald-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
      >
        {dict.notFound.home}
      </Link>
    </div>
  );
}
