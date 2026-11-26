import { stripDocumentExtension } from "@/lib/file-formats";
import type { ParsedCurriculum } from "@/lib/curriculum";
import type { SubjectDocument } from "@/lib/subject-documents";

/**
 * One chapter (Kapitel) of a subject's learning path. Each stored document
 * (PDF, Word, Excel, text or CSV) becomes one chapter: it carries the title,
 * the teaching material and the questions a learner can practise in the
 * practice center.
 */
export type SubjectChapter = {
  /** Stable id: the `Document.id` from the database. */
  id: string;
  /** 1-based position in the learning path. */
  position: number;
  title: string;
  fileName: string;
  language: string;
  pages: number | null;
  truncated: boolean;
  createdAt: Date;
  curriculum: ParsedCurriculum;
};

/** "kapitel_01-einfuehrung.pdf" → "kapitel 01 einfuehrung" (any supported suffix). */
export function readableFileName(fileName: string): string {
  const cleaned = stripDocumentExtension(fileName)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || fileName;
}

/** AI title → stored title → readable file name. */
export function chapterTitle(document: SubjectDocument): string {
  return (
    document.curriculum.title.trim() ||
    document.title?.trim() ||
    readableFileName(document.fileName)
  );
}

/**
 * Turns the documents loaded from Prisma into the ordered chapter list used by
 * the sidebar. The database already returns them oldest first; the index is
 * added here so the UI never has to derive it.
 */
export function buildChapters(documents: SubjectDocument[]): SubjectChapter[] {
  return documents.map((document, index) => ({
    id: document.id,
    position: index + 1,
    title: chapterTitle(document),
    fileName: document.fileName,
    language: document.language,
    pages: document.pages,
    truncated: document.truncated,
    createdAt: document.createdAt,
    curriculum: document.curriculum,
  }));
}
