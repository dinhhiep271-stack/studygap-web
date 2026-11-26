import { NextResponse } from "next/server";
import { sessionCookie, sessionCookieSecure } from "@/lib/auth";

/** `POST /api/auth/logout` – clears the session cookie. */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: sessionCookie,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookieSecure,
    path: "/",
    maxAge: 0,
  });

  return response;
}
