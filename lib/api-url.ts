/**
 * Base URL of the studygap-ai (FastAPI) service — the single source of truth
 * for every AI request this app makes.
 *
 * - `POST /process-document` runs in the browser (upload form) and therefore
 *   reads `NEXT_PUBLIC_STUDYGAP_API_URL`.
 * - `POST /generate-exam` runs on the server (`lib/exam-service.ts`) and
 *   prefers `STUDYGAP_API_URL`.
 *
 * Both variables are optional and fall back to the deployed Render service, so
 * a fresh clone — and a CI/Vercel build without any `.env` — still talks to
 * `https://studygap-ai.onrender.com`.
 */

/** Deployed studygap-ai service on Render. */
export const defaultStudygapApiUrl = "https://studygap-ai.onrender.com";

/**
 * Local development hosts: a FastAPI dev server on `http://127.0.0.1:8000`
 * may stay on plain HTTP — forcing TLS there would only break local testing.
 */
const LOCAL_HOST_PATTERN =
  /^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?(?:\/|$)/i;

/**
 * Trims the value, drops trailing slashes and guarantees an absolute HTTPS URL.
 *
 * A plain `?? "https://studygap-ai.onrender.com"` is not enough on its own:
 * `NEXT_PUBLIC_STUDYGAP_API_URL=""` (set but empty) would win over the default
 * and turn every request into a relative one against this Next.js app, and
 * `https://studygap-ai.onrender.com/` would yield `…//process-document`.
 * Anything unusable (empty, relative, garbage) becomes `defaultStudygapApiUrl`.
 */
export function normalizeApiBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    return defaultStudygapApiUrl;
  }

  const match = /^(https?):\/\/(.+?)\/*$/i.exec(trimmed);

  if (!match) {
    return defaultStudygapApiUrl;
  }

  const [, scheme, host] = match;

  if (scheme.toLowerCase() === "http" && !LOCAL_HOST_PATTERN.test(host)) {
    return `https://${host}`;
  }

  return `${scheme.toLowerCase()}://${host}`;
}
