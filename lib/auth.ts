/**
 * Minimal single-user authentication for Studygap.
 *
 * The credentials and the cookie secret are read from the environment so they
 * can be changed without touching code:
 *
 * - `AUTH_USERNAME` – login name (default: `admin`)
 * - `AUTH_PASSWORD` – password (default: `Imachi.051937`)
 * - `AUTH_SECRET`   – key that signs the session cookie (has a development
 *   default; set a long random value before exposing the app)
 *
 * The session is a stateless, HTTP-only cookie: `base64url(payload).signature`
 * signed with HMAC-SHA256. The signature uses Web Crypto, so the same helpers
 * work in `proxy.ts` (Node runtime) and in route handlers.
 *
 * Server-only: never import this module from a `"use client"` file.
 */

import { hasLocale } from "@/lib/locales";

/** Cookie that stores the signed session. */
export const sessionCookie = "studygap-session";

/** 30 days – long enough for daily use, short enough to expire. */
export const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "Imachi.051937";
const DEFAULT_SECRET = "studygap-local-development-secret";

export const authUsername =
  process.env.AUTH_USERNAME?.trim() || DEFAULT_USERNAME;
export const authPassword = process.env.AUTH_PASSWORD || DEFAULT_PASSWORD;

const sessionSecret = process.env.AUTH_SECRET || DEFAULT_SECRET;

/**
 * `Secure` cookies are only sent over HTTPS (browsers make an exception for
 * localhost). Force the flag off with `AUTH_COOKIE_SECURE=false` when a
 * production build is opened over plain HTTP, e.g. through a LAN IP.
 */
export const sessionCookieSecure =
  process.env.AUTH_COOKIE_SECURE === "true" ||
  (process.env.AUTH_COOKIE_SECURE !== "false" &&
    process.env.NODE_ENV === "production");

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let signingKeyPromise: Promise<CryptoKey> | undefined;

function signingKey(): Promise<CryptoKey> {
  signingKeyPromise ??= crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  return signingKeyPromise;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    return null;
  }

  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

async function sign(value: string): Promise<string> {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(),
    encoder.encode(value),
  );

  return toBase64Url(new Uint8Array(signature));
}

/**
 * Compares through fixed-length SHA-256 digests so that neither the length nor
 * the content of the submitted value leaks through timing.
 */
async function matchesSecret(value: string, expected: string): Promise<boolean> {
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(value)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);
  let difference = 0;

  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }

  return difference === 0;
}

export type Session = {
  username: string;
  /** Unix timestamp in milliseconds. */
  expiresAt: number;
};

/** Creates the signed cookie value for a successful login. */
export async function createSessionToken(
  username: string,
  now = Date.now(),
): Promise<string> {
  const payload = toBase64Url(
    encoder.encode(
      JSON.stringify({
        u: username,
        exp: now + sessionMaxAgeSeconds * 1000,
      }),
    ),
  );

  return `${payload}.${await sign(payload)}`;
}

/**
 * Verifies signature, expiry and user. Returns `null` for anything that is not
 * a valid session, so callers never see forged or expired cookies.
 */
export async function readSessionToken(
  token: string | undefined,
): Promise<Session | null> {
  if (!token) {
    return null;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [payload, signature] = parts;

  if (!constantTimeEqual(signature, await sign(payload))) {
    return null;
  }

  const bytes = fromBase64Url(payload);

  if (!bytes) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(decoder.decode(bytes));

    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const { u, exp } = parsed as { u?: unknown; exp?: unknown };

    if (typeof u !== "string" || typeof exp !== "number") {
      return null;
    }

    if (!Number.isFinite(exp) || exp <= Date.now()) {
      return null;
    }

    // Renaming the user invalidates existing cookies.
    if (u !== authUsername) {
      return null;
    }

    return { username: u, expiresAt: exp };
  } catch {
    return null;
  }
}

export async function isSessionValid(
  token: string | undefined,
): Promise<boolean> {
  return (await readSessionToken(token)) !== null;
}

export async function areCredentialsValid(
  username: string,
  password: string,
): Promise<boolean> {
  const [usernameMatches, passwordMatches] = await Promise.all([
    matchesSecret(username, authUsername),
    matchesSecret(password, authPassword),
  ]);

  return usernameMatches && passwordMatches;
}

/** `true` for `/login` and `/de/login`-style paths (never a valid `next`). */
function isLoginPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 1) {
    return segments[0] === "login";
  }

  return segments.length === 2 && hasLocale(segments[0]) && segments[1] === "login";
}

/**
 * Only same-origin paths are accepted as post-login destination, otherwise a
 * crafted `?next=` could redirect to another site.
 */
export function safeRedirectPath(
  value: string | string[] | undefined,
): string {
  const raw = Array.isArray(value) ? value[0] : value;

  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/";
  }

  // Browsers treat "/\evil.example" like "//evil.example".
  if (raw.includes("\\")) {
    return "/";
  }

  // A login page as destination would bounce between the proxy and the form,
  // so `/login` and every `/<locale>/login` are rejected (query/hash ignored).
  const [pathname] = raw.split(/[?#]/, 1);

  if (isLoginPath(pathname)) {
    return "/";
  }

  return raw;
}
