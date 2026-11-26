/**
 * Auth.js (NextAuth.js v5) – cấu hình đăng nhập Google cho Studygap.
 *
 * - Provider: Google OAuth 2.0 (`next-auth/providers/google`).
 * - Adapter: `@auth/prisma-adapter` dùng chung Prisma client của ứng dụng
 *   (`lib/prisma.ts`), nên người dùng / tài khoản OAuth / phiên đăng nhập được
 *   lưu trong PostgreSQL qua các model `User`, `Account`, `Session`,
 *   `VerificationToken` (xem `prisma/schema.prisma`).
 *
 * Biến môi trường (development: `.env`, production: dashboard của host):
 * - `GOOGLE_CLIENT_ID`     – OAuth Client ID lấy từ Google Cloud Console
 * - `GOOGLE_CLIENT_SECRET` – OAuth Client Secret tương ứng
 * - `AUTH_SECRET`          – khoá ký cookie của Auth.js (đã có sẵn trong `.env`)
 *
 * Các endpoint do `app/api/auth/[...nextauth]/route.ts` cung cấp:
 * - `GET  /api/auth/signin`            – trang đăng nhập có sẵn của Auth.js
 * - `GET  /api/auth/callback/google`   – Google redirect về sau khi đồng ý
 * - `GET  /api/auth/session`           – JSON phiên hiện tại
 * - `POST /api/auth/signout`           – đăng xuất, xoá phiên
 *
 * Chỉ dùng ở server: import `auth`, `signIn`, `signOut` trong Server Component,
 * Server Action hoặc route handler; không import từ file `"use client"`.
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      // Đặt tên biến môi trường tường minh; nếu bỏ trống, Auth.js cũng tự đọc
      // `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  // Mặc định khi có adapter là "database": phiên nằm trong bảng `Session`.
  session: { strategy: "database" },
  // Auth.js từ chối request có `Host` không tin cậy ngoài Vercel. Ứng dụng này
  // còn chạy ở localhost / LAN IP, nên tin tưởng host do request gửi tới.
  trustHost: true,
});
