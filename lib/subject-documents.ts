import { parseCurriculum, type ParsedCurriculum } from "@/lib/curriculum";
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
 * Loads the documents stored for a subject (oldest first so the chapters follow
 * the order in which they were uploaded). Pass `language` to let the database
 * filter the locale the chapter is displayed in. A missing table is treated as
 * "no documents yet".
 */
export async function getSubjectDocuments(
  subjectId: string,
  options: { language?: string } = {},
): Promise<SubjectDocument[]> {
  try {
    const documents = await prisma.document.findMany({
      where: {
        subjectId,
        ...(options.language ? { language: options.language } : {}),
      },
      orderBy: { createdAt: "asc" },
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

    return documents.map((document) => ({
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

/** Number of stored documents that were generated in another language. */
export async function countOtherLanguageDocuments(
  subjectId: string,
  language: string,
): Promise<number> {
  try {
    return await prisma.document.count({
      where: { subjectId, NOT: { language } },
    });
  } catch (error) {
    console.error(
      `Could not count documents for subject "${subjectId}". Run "npm run db:push" to create the tables.`,
      error,
    );
    return 0;
  }
}

/**
 * Stores one AI result. `Document.subjectId` references `Subject.id`, so the
 * subject row is upserted first: the subject list itself lives in
 * `lib/subjects.ts` and is not seeded into the database.
 */
export async function saveSubjectDocument({
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
    where: { id: subjectId },
    create: {
      id: subjectId,
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
