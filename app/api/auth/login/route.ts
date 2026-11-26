import { NextResponse } from "next/server";
import {
  areCredentialsValid,
  createSessionToken,
  sessionCookie,
  sessionCookieSecure,
  sessionMaxAgeSeconds,
} from "@/lib/auth";

type LoginBody = {
  username?: unknown;
  password?: unknown;
};

/**
 * `POST /api/auth/login` – checks the single set of credentials from `.env` and
 * stores a signed, HTTP-only session cookie. The credentials never reach the
 * browser bundle; the login form talks to this route handler.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const { username, password } = (
    typeof body === "object" && body !== null ? body : {}
  ) as LoginBody;

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !username ||
    !password
  ) {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  if (!(await areCredentialsValid(username, password))) {
    return NextResponse.json({ error: "invalid-credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: sessionCookie,
    value: await createSessionToken(username.trim()),
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookieSecure,
    path: "/",
    maxAge: sessionMaxAgeSeconds,
  });

  return response;
}
