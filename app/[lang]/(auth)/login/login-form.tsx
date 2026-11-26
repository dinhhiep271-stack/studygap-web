"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { Spinner } from "@/components/spinner";

export type LoginFormLabels = {
  google: string;
  googleRedirecting: string;
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

/** Official four-colour Google "G". */
function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.26-2.09 3.59-5.17 3.59-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.28v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78l3.99-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.61 4.59 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l3.99 3.1C6.22 6.87 8.87 4.76 12 4.76Z"
      />
    </svg>
  );
}

export function LoginForm({ next, labels }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

  /**
   * Google sign-in is handled by Auth.js: `signIn` fetches the CSRF token,
   * creates the database session and then sends the whole page to the locale
   * page in `next`. The proxy accepts the resulting `authjs.session-token`.
   */
  async function handleGoogleSignIn() {
    setGooglePending(true);
    setError(null);

    try {
      await signIn("google", { redirectTo: next });
    } catch {
      // The browser only gets here when the request to `/api/auth` failed;
      // a successful sign-in leaves the page towards Google.
      setError(labels.network);
      setGooglePending(false);
    }
  }

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
    <>
      <div className="mt-6">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={pending || googlePending}
          className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {googlePending ? (
            <>
              <Spinner className="h-4 w-4" />
              {labels.googleRedirecting}
            </>
          ) : (
            <>
              <GoogleIcon />
              {labels.google}
            </>
          )}
        </button>
      </div>

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
            disabled={pending || googlePending}
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
            disabled={pending || googlePending}
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
          disabled={pending || googlePending}
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
    </>
  );
}
