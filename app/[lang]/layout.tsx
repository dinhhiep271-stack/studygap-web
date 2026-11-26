import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { getDictionary } from "@/lib/i18n";
import { defaultLocale, hasLocale, localeDirection, locales } from "@/lib/locales";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type RootLayoutProps = {
  children: ReactNode;
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: Pick<RootLayoutProps, "params">): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(hasLocale(lang) ? lang : defaultLocale);

  return {
    title: {
      default: dict.meta.defaultTitle,
      template: dict.meta.template,
    },
    description: dict.meta.description,
  };
}

/**
 * Root layout of every localized route. It only owns the document (`<html
 * lang>`, `<html dir>` and `<body>`): the private app shell lives in
 * `app/[lang]/(app)` and the login card in `app/[lang]/(auth)`, so both route
 * groups share this single document instead of duplicating `<html>`.
 *
 * `dir` is always explicit: everything except a right-to-left language code
 * renders `ltr`, so the layout cannot inherit an RTL direction from the
 * browser, an extension or an auto-translated document.
 */
export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  return (
    <html
      lang={lang}
      dir={localeDirection(lang)}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
        {children}
      </body>
    </html>
  );
}
