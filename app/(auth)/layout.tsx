import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { defaultLocale, localeDirection } from "@/lib/locales";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Login · Studygap", template: "%s · Studygap" },
  description: "Private access to Studygap.",
};

/**
 * The login page lives in its own route group, so it gets its own root layout
 * with `<html>` and `<body>` instead of the `[lang]` shell (no header/nav or
 * footer). The language pills on the page set `?lang=`, which the proxy stores
 * in the `studygap-lang` cookie; the page content carries the matching `lang`
 * attribute.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang={defaultLocale}
      dir={localeDirection(defaultLocale)}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
        {children}
      </body>
    </html>
  );
}
