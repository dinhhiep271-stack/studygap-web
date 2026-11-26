import type { ReactNode } from "react";

/**
 * Shell of the authentication routes. It renders the centered card only — no
 * header, navigation, language switcher or logout button — while `<html lang>`
 * and `dir` still come from the shared `[lang]` root layout, so the login page
 * follows the locale in the URL (`/de/login`, `/vi/login`).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      {children}
    </main>
  );
}
