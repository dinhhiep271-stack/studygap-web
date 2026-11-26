"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/spinner";

type LogoutButtonProps = {
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

/** Clears the session cookie and returns to the login page. */
export function LogoutButton({ label, pendingLabel }: LogoutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The proxy rejects the session anyway once the cookie is gone; if the
      // request failed the user lands on the login page and can retry.
    }

    router.replace("/login");
    router.refresh();
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
