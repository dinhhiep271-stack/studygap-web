import type { Locale } from "@/lib/locales";
import { prisma } from "@/lib/prisma";
import {
  subjects as staticSubjects,
  type Subject as StaticSubject,
} from "@/lib/subjects";

/**
 * Một môn học hiển thị được ở mọi trang. Hai nguồn được gộp lại:
 *
 * - `lib/subjects.ts` – bốn môn mẫu, có sẵn mã môn và học kỳ;
 * - bảng `Subject` – môn người dùng tự tạo ở `/[lang]/subject/new`
 *   (`code`/`semester` là `null` vì form tạo môn không hỏi hai thông tin này).
 *
 * Nhờ vậy mọi trang (trang chủ, upload, trang môn học) chỉ cần làm việc với
 * một kiểu dữ liệu duy nhất thay vì kiểm tra "môn tĩnh hay môn trong DB".
 */
export type SubjectProfile = {
  /** Slug dùng nguyên văn trong URL (`/subject/<id>`). */
  id: string;
  /** `de` = tên tiếng Đức, `vi` = tên tiếng Việt. */
  name: Record<Locale, string>;
  /** Mã môn (chỉ môn tĩnh có). */
  code: string | null;
  /** Học kỳ (chỉ môn tĩnh có). */
  semester: Record<Locale, string> | null;
  /** Mô tả ngắn; môn tự tạo lấy từ field `description`. */
  summary: Record<Locale, string>;
};

/** Giới hạn độ dài slug để URL không phình to. */
const MAX_SUBJECT_ID_LENGTH = 60;

/**
 * "BWL Einführung" → "bwl-einfuehrung".
 *
 * Umlaut và `ß` được thay trước khi bỏ dấu, nếu không "ü" sẽ thành "u" và
 * "Einführung" ra "einfuhrung" thay vì "einfuehrung".
 */
export function subjectSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, MAX_SUBJECT_ID_LENGTH)
    .replace(/^-+|-+$/g, "");

  return slug || "fach";
}

function fromStaticSubject(subject: StaticSubject): SubjectProfile {
  return {
    id: subject.id,
    name: subject.name,
    code: subject.code,
    semester: subject.semester,
    summary: subject.summary,
  };
}

/** Cột thật của bảng `Subject` mà trang cần (`name` là tên tiếng Việt). */
type StoredSubject = {
  id: string;
  name: string;
  nameDe: string;
  description: string | null;
};

const storedSubjectSelect = {
  id: true,
  name: true,
  nameDe: true,
  description: true,
} as const;

function fromStoredSubject(row: StoredSubject): SubjectProfile {
  const description = row.description?.trim() ?? "";
  const nameDe = row.nameDe.trim() || row.name;

  return {
    id: row.id,
    name: { de: nameDe, vi: row.name },
    code: null,
    semester: null,
    // Mô tả của môn tự tạo là một chuỗi duy nhất → hiển thị ở cả hai ngôn ngữ.
    summary: { de: description, vi: description },
  };
}

function staticSubjectIds() {
  return new Set(staticSubjects.map((subject) => subject.id));
}

/**
 * Mọi môn của một người dùng: bốn môn mẫu trước, rồi các môn tự tạo theo thứ
 * tự tạo. Hàng `Subject` của môn tĩnh (do upload tạo ra) bị bỏ qua vì
 * `lib/subjects.ts` đã là nguồn hiển thị của nó.
 */
export async function listSubjectProfiles(
  userId: string,
): Promise<SubjectProfile[]> {
  const knownIds = staticSubjectIds();
  let stored: StoredSubject[] = [];

  try {
    stored = await prisma.subject.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: storedSubjectSelect,
    });
  } catch (error) {
    // Thiếu bảng (chưa `npm run db:push`) không được làm hỏng trang chủ; danh
    // sách môn tĩnh vẫn dùng được.
    console.error(
      `Could not load the subjects of user "${userId}". Run "npm run db:push" to create the tables.`,
      error,
    );
  }

  return [
    ...staticSubjects.map(fromStaticSubject),
    ...stored.filter((row) => !knownIds.has(row.id)).map(fromStoredSubject),
  ];
}

/**
 * Một môn của người dùng theo slug: môn tĩnh trước (không cần database), sau
 * đó tới môn tự tạo. `null` khi slug không thuộc về người dùng này.
 */
export async function findSubjectProfile(
  userId: string,
  id: string,
): Promise<SubjectProfile | null> {
  const staticSubject = staticSubjects.find((subject) => subject.id === id);

  if (staticSubject) {
    return fromStaticSubject(staticSubject);
  }

  try {
    const row = await prisma.subject.findUnique({
      where: { userId_id: { userId, id } },
      select: storedSubjectSelect,
    });

    return row ? fromStoredSubject(row) : null;
  } catch (error) {
    console.error(
      `Could not load subject "${id}". Run "npm run db:push" to create the tables.`,
      error,
    );

    return null;
  }
}

/**
 * Slug còn trống cho người dùng này. Slug trùng với môn tĩnh cũng bị bỏ qua:
 * `findSubjectProfile` luôn trả môn tĩnh trước, nên một hàng trùng slug sẽ
 * không bao giờ hiển thị.
 */
async function availableSubjectId(userId: string, base: string) {
  const knownIds = staticSubjectIds();

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;

    if (knownIds.has(candidate)) {
      continue;
    }

    const existing = await prisma.subject.findUnique({
      where: { userId_id: { userId, id: candidate } },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  // Thực tế không xảy ra, nhưng không để việc lưu thất bại vì slug.
  return `${base}-${Date.now().toString(36)}`;
}

export type NewSubjectInput = {
  userId: string;
  /** Tên tiếng Đức – bắt buộc, cũng là nguồn của slug. */
  nameDe: string;
  /** Tên tiếng Việt – bắt buộc. */
  name: string;
  /** Mô tả ngắn, có thể rỗng. */
  description: string;
};

/**
 * Tạo môn học mới cho người dùng hiện tại. Hàng `Subject` được tạo ngay (chưa
 * cần tài liệu), nhờ vậy môn xuất hiện trong danh sách chọn của trang upload và
 * có trang riêng ngay sau khi lưu.
 */
export async function createSubject({
  userId,
  nameDe,
  name,
  description,
}: NewSubjectInput): Promise<SubjectProfile> {
  const id = await availableSubjectId(userId, subjectSlug(nameDe));
  const row = await prisma.subject.create({
    data: {
      id,
      userId,
      name,
      nameDe,
      description: description || null,
    },
    select: storedSubjectSelect,
  });

  return fromStoredSubject(row);
}
