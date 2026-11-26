/**
 * Client-side mirror of the formats the studygap-ai service understands
 * (`FORMAT_LABELS` in the FastAPI app): `.pdf`, `.docx`, `.xlsx`, `.txt` and
 * `.csv`. Keep both lists in sync — an unsupported file is rejected by the API
 * with HTTP 415.
 */

export type DocumentFormatInfo = {
  /** Lower-case extension including the dot. */
  extension: string;
  /** Short label rendered by `FileTypeBadge`. */
  label: string;
  /** MIME types browsers report for this format. */
  mimeTypes: readonly string[];
  /** Badge text colour, matching the format family. */
  badgeClassName: string;
};

export const DOCUMENT_FORMATS: readonly DocumentFormatInfo[] = [
  {
    extension: ".pdf",
    label: "PDF",
    mimeTypes: ["application/pdf", "application/x-pdf"],
    badgeClassName: "text-red-600",
  },
  {
    extension: ".docx",
    label: "DOCX",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    badgeClassName: "text-blue-600",
  },
  {
    extension: ".xlsx",
    label: "XLSX",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    badgeClassName: "text-emerald-600",
  },
  {
    extension: ".txt",
    label: "TXT",
    mimeTypes: ["text/plain"],
    badgeClassName: "text-zinc-600",
  },
  {
    extension: ".csv",
    label: "CSV",
    mimeTypes: ["text/csv", "application/csv"],
    badgeClassName: "text-amber-600",
  },
];

/** Value for the `<input type="file" accept>` attribute. */
export const DOCUMENT_ACCEPT = DOCUMENT_FORMATS.flatMap((format) => [
  ...format.mimeTypes,
  format.extension,
]).join(",");

/** Lower-case extension including the dot, or "" when the name has none. */
export function documentExtension(fileName: string) {
  const match = /\.([a-z0-9]+)\s*$/i.exec(fileName);

  return match ? `.${match[1].toLowerCase()}` : "";
}

/**
 * Format of a picked file, or `null` when it is not supported. Mirrors the
 * Python service: the extension wins, the MIME type is only a fallback (some
 * browsers report an empty `type` for `.csv` and `.txt`).
 */
export function getDocumentFormat(
  fileName: string,
  mimeType = "",
): DocumentFormatInfo | null {
  const extension = documentExtension(fileName);
  const byExtension = DOCUMENT_FORMATS.find(
    (format) => format.extension === extension,
  );

  if (byExtension) {
    return byExtension;
  }

  const media = mimeType.split(";")[0].trim().toLowerCase();

  if (!media) {
    return null;
  }

  return (
    DOCUMENT_FORMATS.find((format) => format.mimeTypes.includes(media)) ?? null
  );
}

export function isSupportedDocument(fileName: string, mimeType = "") {
  return getDocumentFormat(fileName, mimeType) !== null;
}

/** "kapitel_01.docx" → "kapitel_01"; unsupported suffixes are kept as-is. */
export function stripDocumentExtension(fileName: string) {
  const extension = documentExtension(fileName);

  if (!extension || !isSupportedDocument(fileName)) {
    return fileName;
  }

  return fileName.slice(0, -extension.length);
}
