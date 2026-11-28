import {
  hasCurriculumLocale,
  parseCurriculum,
  type ParsedCurriculum,
} from "@/lib/curriculum";
import type { Locale } from "@/lib/locales";
import { prisma } from "@/lib/prisma";

/** A stored document plus the parsed curriculum, ready for the subject page. */
export type SubjectDocument = {
  id: string;
  fileName: string;
  /** Kapitel title stored at upload time (AI title or readable file name). */
  title: string | null;
  /** Locale the AI wrote the content in: "de" or "vi". */
  language: string;
  pages: number | null;
  truncated: boolean;
  createdAt: Date;
  curriculum: ParsedCurriculum;
};

export type NewSubjectDocument = {
  /** Chủ sở hữu (lấy từ `getCurrentUserId()`). */
  userId: string;
  subjectId: string;
  fileName: string;
  title: string;
  language: string;
  pages: number | null;
  truncated: boolean;
  /** Raw JSON returned by the studygap-ai service. */
  content: unknown;
  /** Metadata used to keep the `Subject` row (foreign key target) in sync. */
  subject: {
    name: string;
    nameDe: string;
    description: string;
  };
};

function parseContent(content: string): ParsedCurriculum {
  if (!content) {
    return parseCurriculum(null);
  }

  try {
    return parseCurriculum(JSON.parse(content));
  } catch {
    // A row that is not valid JSON (or a legacy plain-text row) yields empty
    // sections instead of breaking the whole page.
    return parseCurriculum(content);
  }
}

/**
 * Orders documents the way a human reads chapter file names. `numeric: true`
 * makes embedded numbers sort by value, so "Kapitel_2" comes before
 * "Kapitel_10" instead of landing after it. Upload time is the tie-breaker.
 */
function compareDocumentsByFileName(
  a: { fileName: string; createdAt: Date },
  b: { fileName: string; createdAt: Date },
): number {
  const byFileName = a.fileName.localeCompare(b.fileName, undefined, {
    numeric: true,
    sensitivity: "base",
  });

  if (byFileName !== 0) {
    return byFileName;
  }

  return a.createdAt.getTime() - b.createdAt.getTime();
}

/**
 * Loads the documents stored for a subject **of one user**, ordered by file name
 * (Kapitel 2 before Kapitel 10) so the chapters follow the numbering the learner
 * used when uploading. Bilingual teaching is usable in both locales, so the
 * subject page and the exam route load every document and filter with
 * `documentsForLocale`. A missing table is treated as "no documents yet".
 */
export async function getSubjectDocuments(
  userId: string,
  subjectId: string,
): Promise<SubjectDocument[]> {
  try {
    const documents = await prisma.document.findMany({
      where: {
        userId,
        subjectId,
      },
      // Upload time keeps the query deterministic; the numeric file-name sort
      // below is the order the sidebar actually shows.
      orderBy: [{ createdAt: "asc" }, { fileName: "asc" }],
      select: {
        id: true,
        fileName: true,
        title: true,
        language: true,
        pages: true,
        truncated: true,
        createdAt: true,
        content: true,
      },
    });

    return [...documents].sort(compareDocumentsByFileName).map((document) => ({
      id: document.id,
      fileName: document.fileName,
      title: document.title,
      language: document.language,
      pages: document.pages,
      truncated: document.truncated,
      createdAt: document.createdAt,
      curriculum: parseContent(document.content),
    }));
  } catch (error) {
    console.error(
      `Could not load documents for subject "${subjectId}". Run "npm run db:push" to create the tables.`,
      error,
    );
    return [];
  }
}

/**
 * Documents that can be shown in `locale`: either the AI generated them in that
 * language (`document.language`), or the teaching is bilingual
 * (`summary_de` / `summary_vi`, `concepts_de` / `concepts_vi`), so the same
 * chapter is readable after switching DE ↔ VI. This filters in memory because the
 * parsed curriculum, not a database column, carries the translations.
 */
export function documentsForLocale(
  documents: SubjectDocument[],
  locale: Locale,
): SubjectDocument[] {
  return documents.filter(
    (document) =>
      document.language === locale ||
      hasCurriculumLocale(document.curriculum, locale),
  );
}

/**
 * Stores one AI result. `Document.subjectId` references `Subject.id`, so the
 * subject row is upserted first:
 *
 * - static subjects (`lib/subjects.ts`) are not seeded into the database, so
 *   uploading the first document creates their row;
 * - subjects created on `/[lang]/subject/new` already exist and the upsert
 *   simply rewrites the same names.
 *
 * The row is keyed by `(userId, subjectId)` – two users can own the same subject
 * slug without sharing documents.
 */
export async function saveSubjectDocument({
  userId,
  subjectId,
  fileName,
  title,
  language,
  pages,
  truncated,
  content,
  subject,
}: NewSubjectDocument): Promise<{ id: string }> {
  await prisma.subject.upsert({
    where: { userId_id: { userId, id: subjectId } },
    create: {
      id: subjectId,
      userId,
      name: subject.name,
      nameDe: subject.nameDe,
      description: subject.description,
    },
    update: {
      name: subject.name,
      nameDe: subject.nameDe,
      description: subject.description,
    },
  });

  return prisma.document.create({
    data: {
      userId,
      subjectId,
      fileName,
      title,
      language,
      pages,
      truncated,
      content: JSON.stringify(content ?? null),
    },
    select: { id: true },
  });
}
