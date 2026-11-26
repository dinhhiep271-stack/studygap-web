"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { Spinner } from "@/components/spinner";
import type { Locale } from "@/lib/locales";

type LogoutButtonProps = {
  /** Locale of the login page the user is sent to after logging out. */
  lang: Locale;
  label: string;
  pendingLabel: string;
};

function LogoutIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M14.5 4H18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M9.5 8 5.5 12l4 4M6 12h9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Signs the visitor out of both login backends and returns to the localized
 * login page.
 *
 * - `signOut` from `next-auth/react` deletes the `Session` row of the Google
 *   login, clears the `authjs.session-token` cookie and then performs a hard
 *   navigation to `redirectTo`. Because the page is fully reloaded, the button
 *   can never stay stuck in its pending state.
 * - `POST /api/auth/logout` clears the older HMAC cookie written by the
 *   credentials form (`lib/auth.ts`), which Auth.js knows nothing about.
 */
export function LogoutButton({
  lang,
  label,
  pendingLabel,
}: LogoutButtonProps) {
  const [pending, setPending] = useState(false);
  const loginPath = `/${lang}/login`;

  async function handleLogout() {
    setPending(true);

    // Clear the credentials cookie first: `signOut` navigates away, and nothing
    // queued after that navigation is guaranteed to run.
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Network hiccup – the Auth.js sign-out below is the important part.
    }

    try {
      // `redirectTo` is the Auth.js v5 name of `callbackUrl`.
      await signOut({ redirectTo: loginPath });
    } catch {
      // Auth.js unreachable: re-enable the button so the user can retry instead
      // of being stuck on a spinner. `/api/auth/logout` already cleared the
      // session cookies, so the next navigation lands on the login page.
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      aria-label={pending ? pendingLabel : label}
      title={label}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 sm:px-3 sm:text-sm"
    >
      {pending ? <Spinner className="h-4 w-4" /> : <LogoutIcon />}
      <span className="hidden sm:inline">
        {pending ? pendingLabel : label}
      </span>
    </button>
  );
}
