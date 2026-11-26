import { getDocumentFormat } from "@/lib/file-formats";

/**
 * Format chip (PDF, DOCX, XLSX, TXT, CSV) in front of an uploaded file.
 * Shared by the selection list, the waiting screen and the result card.
 */
export function FileTypeBadge({ fileName }: { fileName: string }) {
  const format = getDocumentFormat(fileName);

  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[11px] font-bold ring-1 ring-zinc-200 ${
        format?.badgeClassName ?? "text-zinc-600"
      }`}
    >
      {format?.label ?? "FILE"}
    </span>
  );
}
