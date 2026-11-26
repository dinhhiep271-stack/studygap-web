import { NextResponse } from "next/server";
import { signOut as signOutOfAuthjs } from "@/auth";
import { sessionCookie } from "@/lib/auth";

/**
 * `POST /api/auth/logout` – ends the session of both login backends.
 *
 * - Auth.js (Google): `signOut` deletes the row in `Session` and clears the
 *   `authjs.session-token` cookie. Without it, clearing only the old cookie
 *   would leave the Google session valid and the proxy would bounce the user
 *   straight back from `/de/login` into the app.
 * - Credentials form: the HMAC `studygap-session` cookie is expired below.
 */
export async function POST() {
  // `redirect: false` – the client decides where to go after both cookies are
  // gone (see `components/logout-button.tsx`). Never throws when no Auth.js
  // session exists; a failure must not keep the old cookie alive.
  try {
    await signOutOfAuthjs({ redirect: false });
  } catch (error) {
    console.error("Could not end the Auth.js session.", error);
  }

  const response = NextResponse.json({ ok: true });
  // `delete` bắt buộc: nó gửi `Expires=Thu, 01 Jan 1970` (Next 16 bỏ qua
  // `maxAge: 0` trên response cookie), nên browser thực sự xoá cookie HMAC.
  response.cookies.delete(sessionCookie);

  return response;
}
