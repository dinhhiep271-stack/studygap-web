/**
 * Route handler của Auth.js: mọi request `/api/auth/*` (trừ hai route tĩnh
 * `/api/auth/login` và `/api/auth/logout` của form đăng nhập cũ) được xử lý bởi
 * `handlers` trong `auth.ts`:
 *
 * - `GET  /api/auth/signin`          – trang đăng nhập Google
 * - `GET  /api/auth/callback/google` – callback OAuth
 * - `POST /api/auth/signout`         – đăng xuất
 * - `GET  /api/auth/session`         – phiên hiện tại dạng JSON
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
