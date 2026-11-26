"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Spinner } from "@/components/spinner";

export type LoginFormLabels = {
  username: string;
  password: string;
  submit: string;
  submitting: string;
  invalid: string;
  missing: string;
  network: string;
};

type LoginFormProps = {
  /** Validated same-origin path the user is sent to after a successful login. */
  next: string;
  labels: LoginFormLabels;
};

const inputClassName =
  "mt-2 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 transition-colors focus-visible:border-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500";

export function LoginForm({ next, labels }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!username.trim() || !password) {
      setError(labels.missing);
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (response.ok) {
        // The login page and the app shell share the `[lang]` root layout, so
        // this is a soft navigation; `refresh()` re-renders the server
        // components with the fresh session cookie.
        router.replace(next);
        router.refresh();
        return;
      }

      setError(response.status === 401 ? labels.invalid : labels.network);
    } catch {
      setError(labels.network);
    }

    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <div>
        <label
          htmlFor="login-username"
          className="text-sm font-semibold text-zinc-900"
        >
          {labels.username}
        </label>
        <input
          id="login-username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          disabled={pending}
          className={inputClassName}
        />
      </div>

      <div className="mt-4">
        <label
          htmlFor="login-password"
          className="text-sm font-semibold text-zinc-900"
        >
          {labels.password}
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={pending}
          className={inputClassName}
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-400"
      >
        {pending ? (
          <>
            <Spinner className="h-4 w-4" />
            {labels.submitting}
          </>
        ) : (
          labels.submit
        )}
      </button>
    </form>
  );
}
