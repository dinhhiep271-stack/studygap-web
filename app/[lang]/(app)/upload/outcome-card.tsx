import { CurriculumContent } from "@/components/curriculum-sections";
import { FileTypeBadge } from "@/components/file-type-badge";
import { stripDocumentExtension } from "@/lib/file-formats";
import type { Dictionary } from "@/lib/i18n";
import {
  keyConceptsForLocale,
  type ParsedCurriculum,
} from "@/lib/curriculum";
import type { Locale } from "@/lib/locales";

export type OutcomeCardProps = {
  fileName: string;
  fileSizeLabel: string;
  pages?: number;
  truncated: boolean;
  error?: string;
  /** Non-fatal problem, e.g. the result could not be stored in the database. */
  warning?: string;
  result?: ParsedCurriculum;
  /** Upload language: the preview shows the summary/concepts in this language. */
  locale: Locale;
  dict: Dictionary;
};

/** The AI response has no title field: fall back to a readable file name. */
function titleFromFileName(fileName: string) {
  return stripDocumentExtension(fileName)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Result of one uploaded file: header, metadata chips and the full curriculum.
 * The content itself is rendered by the shared `CurriculumContent`, so the
 * upload preview and the subject page look the same.
 */
export function OutcomeCard({
  fileName,
  fileSizeLabel,
  pages,
  truncated,
  error,
  warning,
  result,
  locale,
  dict,
}: OutcomeCardProps) {
  const upload = dict.upload;
  const labels = dict.curriculum;
  const conceptCount = result ? keyConceptsForLocale(result, locale).length : 0;

  const metaChips = result
    ? [
        pages !== undefined
          ? { label: upload.resultPagesLabel, value: String(pages) }
          : null,
        result.questions.length > 0
          ? {
              label: labels.questions,
              value: String(result.questions.length),
            }
          : null,
        conceptCount > 0
          ? {
              label: labels.concepts,
              value: String(conceptCount),
            }
          : null,
        result.formulas.length > 0
          ? {
              label: labels.formulas,
              value: String(result.formulas.length),
            }
          : null,
        result.examples.length > 0
          ? {
              label: labels.examples,
              value: String(result.examples.length),
            }
          : null,
      ].filter((item): item is { label: string; value: string } => item !== null)
    : [];

  return (
    <article
      className={`rounded-2xl border bg-white p-6 shadow-sm sm:p-8 ${
        result ? "border-emerald-200" : "border-red-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <FileTypeBadge fileName={fileName} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900">
            {fileName}
          </p>
          <p className="text-xs text-zinc-500">{fileSizeLabel}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
            result
              ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
              : "bg-red-50 text-red-700 ring-red-100"
          }`}
        >
          {result ? upload.resultSuccessBadge : upload.resultFailedBadge}
        </span>
      </div>

      {warning ? (
        <p
          role="status"
          className="mt-4 rounded-lg bg-amber-50 px-4 py-2.5 text-xs leading-5 text-amber-800"
        >
          {warning}
        </p>
      ) : null}

      {result ? (
        <>
          <div className="mt-6 border-t border-zinc-100 pt-6">
            <h3 className="text-2xl font-semibold tracking-tight text-zinc-900">
              {result.title ||
                titleFromFileName(fileName) ||
                upload.resultUntitled}
            </h3>

            {metaChips.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {metaChips.map((item, index) => (
                  <span
                    key={`${item.label}-${index}`}
                    className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100"
                  >
                    {item.label}: {item.value}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <CurriculumContent
            curriculum={result}
            labels={labels}
            locale={locale}
          />

          {truncated ? (
            <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
              {upload.resultTruncatedNote}
            </p>
          ) : null}
        </>
      ) : (
        <div className="mt-5 rounded-xl bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-800">
            {upload.resultFailedHint}
          </p>
          <p className="mt-1 text-sm leading-6 text-red-700">
            {error ?? upload.errors.unexpected}
          </p>
        </div>
      )}
    </article>
  );
}
