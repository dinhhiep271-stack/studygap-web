import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Xác định chủ sở hữu dữ liệu (Subject / Document / Exam) của request hiện tại.
 *
 * - Đăng nhập Google (Auth.js): trả về `session.user.id` – mỗi tài khoản Google
 *   có một không gian môn học riêng.
 * - Đăng nhập bằng cookie cũ (`studygap-session`, xem `lib/auth.ts`): Auth.js
 *   không biết phiên này nên `auth()` trả `null`. Dữ liệu của luồng cũ được giữ
 *   dưới một người dùng cố định trong bảng `User`, nhờ vậy tài liệu đã upload
 *   trước đây không bị mất và vẫn tách khỏi tài khoản Google.
 *
 * Hàm này đọc cookie nên chỉ được gọi bên trong Server Component nằm dưới một
 * `<Suspense>` (quy định Cache Components của Next.js) hoặc trong Route Handler.
 */
const LEGACY_OWNER_ID = "legacy-local-owner";
const LEGACY_OWNER_EMAIL = "legacy-owner@studygap.local";

/**
 * `upsert` chỉ chạy một lần cho mỗi tiến trình server; các request sau dùng lại
 * promise đã resolve. Nếu lần đầu thất bại (DB tạm mất kết nối) thì xoá cache
 * để request kế tiếp thử lại.
 */
let legacyOwnerId: Promise<string> | null = null;

function ensureLegacyOwner(): Promise<string> {
  legacyOwnerId ??= prisma.user
    .upsert({
      where: { id: LEGACY_OWNER_ID },
      create: {
        id: LEGACY_OWNER_ID,
        email: LEGACY_OWNER_EMAIL,
        name: "Local admin",
      },
      update: {},
      select: { id: true },
    })
    .then((user) => user.id)
    .catch((error: unknown) => {
      legacyOwnerId = null;
      throw error;
    });

  return legacyOwnerId;
}

export async function getCurrentUserId(): Promise<string> {
  const session = await auth();

  if (session) {
    const userId = session.user?.id;

    // Với session strategy "database", adapter luôn gắn `user.id`. Thiếu id
    // nghĩa là cấu hình sai – báo lỗi thay vì âm thầm rơi về dữ liệu legacy.
    if (!userId) {
      throw new Error("Signed-in session has no user id.");
    }

    return userId;
  }

  return ensureLegacyOwner();
}
