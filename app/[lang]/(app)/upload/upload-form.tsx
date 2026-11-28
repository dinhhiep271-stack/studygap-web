"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { normalizeApiBaseUrl } from "@/lib/api-url";
import { readableFileName } from "@/lib/chapters";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/locales";
import { parseCurriculum, type ParsedCurriculum } from "@/lib/curriculum";
import { DOCUMENT_ACCEPT, isSupportedDocument } from "@/lib/file-formats";
import { FileTypeBadge } from "@/components/file-type-badge";
import { OutcomeCard } from "./outcome-card";

/**
 * Must match MAX_UPLOAD_BYTES in the FastAPI service (main.py) – raising it here
 * alone only moves the rejection to the API: files above the service limit fail
 * after the upload finished.
 */
const MAX_FILE_SIZE = 70 * 1024 * 1024;
/** Must match MAX_BATCH_FILES in the FastAPI service (main.py). */
const MAX_FILES = 10;

/**
 * Python/FastAPI service (studygap-ai) that turns documents (PDF, Word, Excel,
 * plain text and CSV) into course plans. It runs on Render
 * (https://studygap-ai.onrender.com); `NEXT_PUBLIC_STUDYGAP_API_URL` can
 * override the address, and `normalizeApiBaseUrl` keeps the result HTTPS with
 * no trailing slash.
 */
const PROCESS_DOCUMENT_URL = `${normalizeApiBaseUrl(
  process.env.NEXT_PUBLIC_STUDYGAP_API_URL,
)}/process-document`;

type UploadError = "unsupported" | "tooLarge" | "tooMany" | "noFile";

/** One element of the JSON array returned by POST /process-document. */
type ProcessDocumentResponse = {
  success?: boolean;
  filename?: string;
  status_code?: number;
  model?: string;
  pages?: number;
  characters_extracted?: number;
  truncated?: boolean;
  /** Raw AI contract; normalised through `parseCurriculum`. */
  data?: unknown;
  error?: string;
  detail?: unknown;
};

/** Where one file of the batch currently is in the sequential upload. */
type FileStage = "queued" | "processing" | "saving" | "stored" | "failed";

/** Live state of one file while the batch is uploaded one file at a time. */
type ProgressFile = {
  key: string;
  filename: string;
  size: number;
  stage: FileStage;
  /** Set when the file was processed but could not be stored. */
  warning?: string;
  /** Set when the AI request for this file failed. */
  error?: string;
};

/** UI state for one uploaded file: the curriculum or the failure reason. */
type FileOutcome = {
  key: string;
  filename: string;
  size: number;
  ok: boolean;
  pages?: number;
  truncated?: boolean;
  error?: string;
  /** Set when the AI result could not be stored in the database. */
  warning?: string;
  /** `Document.id` returned by `/api/documents` – one row (chapter) per file. */
  documentId?: string;
  /** Raw AI payload, sent to /api/documents unchanged. */
  raw?: unknown;
  result?: ParsedCurriculum;
};

/** One option of the subject picker on the upload page. */
export type SubjectOption = {
  id: string;
  name: string;
  /** `null` for subjects the user created (they have no course code). */
  code: string | null;
};

type UploadFormProps = {
  lang: Locale;
  dict: Dictionary;
  subjects: SubjectOption[];
  initialSubjectId: string;
};

function fileKey(file: File) {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Accepts the same formats the Python service reads: PDF, Word, Excel, text, CSV. */
function validateDocument(file: File): UploadError | null {
  if (!isSupportedDocument(file.name, file.type)) {
    return "unsupported";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "tooLarge";
  }

  return null;
}

/** FastAPI errors arrive as `detail`, model failures as `error`. */
function getApiErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if (typeof record.detail === "string" && record.detail.trim()) {
      return record.detail;
    }

    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }
  }

  return fallback;
}

/** Pair the n-th selected file with the n-th element of the API response. */
function toOutcome(
  file: File,
  payload: ProcessDocumentResponse | undefined,
  fallbackError: string,
): FileOutcome {
  const base = {
    key: fileKey(file),
    filename: payload?.filename?.trim() || file.name,
    size: file.size,
  };

  if (!payload) {
    return { ...base, ok: false, error: fallbackError };
  }

  const curriculum = payload.data;

  if (payload.success === false || !curriculum) {
    return {
      ...base,
      ok: false,
      error: getApiErrorMessage(payload, fallbackError),
    };
  }

  return {
    ...base,
    ok: true,
    pages: typeof payload.pages === "number" ? payload.pages : undefined,
    truncated: payload.truncated === true,
    raw: curriculum,
    result: parseCurriculum(curriculum),
  };
}

/**
 * The FastAPI service answers with a JSON array holding one element per
 * uploaded file. Every request now carries exactly one file, so the first
 * element is that file's result; a bare object is accepted as a fallback.
 */
function firstProcessResult(
  payload: unknown,
): ProcessDocumentResponse | undefined {
  if (Array.isArray(payload)) {
    return payload.length > 0
      ? (payload[0] as ProcessDocumentResponse)
      : undefined;
  }

  if (payload && typeof payload === "object") {
    return payload as ProcessDocumentResponse;
  }

  return undefined;
}

/** Kapitel title for the upload summary: AI title, else the readable file name. */
function chapterTitleForOutcome(outcome: FileOutcome) {
  return outcome.result?.title.trim() || readableFileName(outcome.filename);
}

/**
 * Stores one AI result through `/api/documents` immediately after that file was
 * processed, so every file becomes its own `Document` row (one Kapitel). A
 * failure is not fatal: the parsed result stays visible, the outcome only gets
 * a warning.
 */
async function persistOutcome(
  outcome: FileOutcome,
  subjectId: string,
  language: Locale,
  saveErrorMessage: string,
  signal?: AbortSignal,
): Promise<FileOutcome> {
  try {
    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId,
        fileName: outcome.filename,
        language,
        pages: outcome.pages ?? null,
        truncated: outcome.truncated === true,
        curriculum: outcome.raw,
      }),
      signal,
    });

    if (!response.ok) {
      return { ...outcome, warning: saveErrorMessage };
    }

    const payload = (await response.json().catch(() => null)) as {
      document?: { id?: string };
    } | null;
    const documentId = payload?.document?.id;

    return {
      ...outcome,
      documentId: typeof documentId === "string" ? documentId : undefined,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    return { ...outcome, warning: saveErrorMessage };
  }
}

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className}`}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeOpacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M12 16V4m0 0L7 9m5-5 5 5" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function UploadForm({
  lang,
  dict,
  subjects,
  initialSubjectId,
}: UploadFormProps) {
  const upload = dict.upload;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** Start of the file that is currently being processed (per-file timer). */
  const fileStartedAtRef = useRef(0);

  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [selected, setSelected] = useState<File[]>([]);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [outcomes, setOutcomes] = useState<FileOutcome[] | null>(null);
  /** Live stage of every selected file (queued → processing → saving → stored). */
  const [progressFiles, setProgressFiles] = useState<ProgressFile[]>([]);

  // Tick every second while the sequential upload runs. The timer restarts for
  // each file, so the counter shows how long the AI has been working on the
  // document that is currently being processed.
  useEffect(() => {
    if (!processing) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - fileStartedAtRef.current) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [processing]);

  /** Copies one stage change into the per-file progress list. */
  function updateProgress(
    key: string,
    patch: Partial<Pick<ProgressFile, "stage" | "warning" | "error">>,
  ) {
    setProgressFiles((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  }

  /** Validate, de-duplicate and append files to the selection (max. 10). */
  function addFiles(fileList: FileList | File[]) {
    const issues: string[] = [];
    const next = [...selected];
    const known = new Set(next.map(fileKey));
    let limitReached = false;

    for (const file of Array.from(fileList)) {
      const reason = validateDocument(file);

      if (reason) {
        issues.push(`${file.name}: ${upload.errors[reason]}`);
        continue;
      }

      const key = fileKey(file);

      if (known.has(key)) {
        continue;
      }

      if (next.length >= MAX_FILES) {
        limitReached = true;
        continue;
      }

      known.add(key);
      next.push(file);
    }

    if (limitReached) {
      issues.push(upload.errors.tooMany);
    }

    setSelected(next);
    setFormErrors(issues);
    setOutcomes(null);
    setRedirecting(false);
  }

  function removeFile(key: string) {
    setSelected((current) => current.filter((file) => fileKey(file) !== key));
    setFormErrors([]);
  }

  function clearAll() {
    setSelected([]);
    setFormErrors([]);
    setOutcomes(null);
    setRedirecting(false);

    // Reset the native input so the same file can be picked again.
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) {
      addFiles(event.target.files);
    }

    event.target.value = "";
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (!busy) {
      setDragActive(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;

    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    setDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    if (busy) {
      return;
    }

    if (event.dataTransfer?.files?.length) {
      addFiles(event.dataTransfer.files);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (processing) {
      return;
    }

    if (selected.length === 0) {
      setFormErrors([upload.errors.noFile]);
      return;
    }

    const filesToSend = selected;
    const controller = new AbortController();
    abortRef.current = controller;

    setFormErrors([]);
    setOutcomes(null);
    setRedirecting(false);
    setElapsed(0);
    setProcessing(true);
    setProgressFiles(
      filesToSend.map((file) => ({
        key: fileKey(file),
        filename: file.name,
        size: file.size,
        stage: "queued",
      })),
    );

    // Results are collected locally so the UI can show a chapter as soon as its
    // file is stored, without waiting for the rest of the batch.
    const collected: FileOutcome[] = [];
    let cancelled = false;

    try {
      for (const file of filesToSend) {
        if (controller.signal.aborted) {
          cancelled = true;
          break;
        }

        const key = fileKey(file);

        // One request per file (sequential instead of one large batch): the
        // FastAPI service accepts the same multipart field ("files") repeated,
        // so a single file still answers with a one-element JSON array. Short
        // requests avoid timeouts and let the UI follow every document.
        const formData = new FormData();
        formData.append("files", file, file.name);
        // Output language of the generated curriculum (de | vi).
        formData.append("lang", lang);

        fileStartedAtRef.current = Date.now();
        setElapsed(0);
        updateProgress(key, { stage: "processing" });

        try {
          const response = await fetch(PROCESS_DOCUMENT_URL, {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });
          const payload: unknown = await response.json().catch(() => null);

          if (!response.ok) {
            throw new Error(getApiErrorMessage(payload, upload.errors.unexpected));
          }

          let outcome = toOutcome(
            file,
            firstProcessResult(payload),
            upload.errors.unexpected,
          );

          // Store this file immediately: `/api/documents` creates one Document
          // row, i.e. one chapter of the subject, per file.
          if (outcome.ok) {
            updateProgress(key, { stage: "saving" });
            setSaving(true);
            outcome = await persistOutcome(
              outcome,
              subjectId,
              lang,
              upload.errors.save,
              controller.signal,
            );
            setSaving(false);
          }

          collected.push(outcome);
          setOutcomes([...collected]);
          updateProgress(key, {
            // A processed file that could not be stored is not a chapter yet.
            stage: outcome.ok && !outcome.warning ? "stored" : "failed",
            warning: outcome.warning,
            error: outcome.error,
          });
        } catch (error) {
          setSaving(false);

          if (error instanceof Error && error.name === "AbortError") {
            // Cancelled by the user: this file and the remaining ones keep
            // their selection entry so they can be uploaded again.
            updateProgress(key, { stage: "queued" });
            cancelled = true;
            break;
          }

          const message =
            error instanceof TypeError
              ? upload.errors.network
              : error instanceof Error && error.message
                ? error.message
                : upload.errors.unexpected;

          const outcome: FileOutcome = {
            key,
            filename: file.name,
            size: file.size,
            ok: false,
            error: message,
          };

          collected.push(outcome);
          setOutcomes([...collected]);
          updateProgress(key, { stage: "failed", error: message });
        }
      }

      // Stored files leave the selection; failed or cancelled files stay there
      // so a retry does not upload the already stored chapters twice.
      const storedKeys = new Set(
        collected
          .filter((outcome) => outcome.ok && !outcome.warning)
          .map((outcome) => outcome.key),
      );

      if (storedKeys.size > 0) {
        setSelected((current) =>
          current.filter((file) => !storedKeys.has(fileKey(file))),
        );

        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }

      // Only redirect once every selected file was processed *and* stored;
      // otherwise the cards and the chapter list explain what failed.
      const allStored =
        !cancelled &&
        collected.length === filesToSend.length &&
        collected.every((outcome) => outcome.ok && !outcome.warning);

      if (allStored) {
        // Open the subject page on the first chapter of this upload.
        const firstDocumentId = collected.find(
          (outcome) => outcome.documentId,
        )?.documentId;

        setRedirecting(true);
        router.push(
          firstDocumentId
            ? `/${lang}/subject/${subjectId}?chapter=${firstDocumentId}`
            : `/${lang}/subject/${subjectId}`,
        );
      }
    } finally {
      abortRef.current = null;
      setProgressFiles([]);
      setProcessing(false);
      setSaving(false);
      setElapsed(0);
    }
  }

  const successCount = outcomes?.filter((outcome) => outcome.ok).length ?? 0;
  /** Every stored outcome is one chapter of the subject. */
  const storedOutcomes =
    outcomes?.filter((outcome) => outcome.ok && !outcome.warning) ?? [];
  /** Deep link to the first newly stored chapter (`?chapter=<document id>`). */
  const firstStoredChapterId = storedOutcomes[0]?.documentId;
  const busy = processing || saving;

  const finishedFiles = progressFiles.filter(
    (item) => item.stage === "stored" || item.stage === "failed",
  ).length;
  const activeFilePosition = progressFiles.length
    ? Math.min(finishedFiles + 1, progressFiles.length)
    : 0;
  const progressPercent = progressFiles.length
    ? Math.round((finishedFiles / progressFiles.length) * 100)
    : 0;

  const stageLabels: Record<FileStage, string> = {
    queued: upload.queueWaiting,
    processing: upload.waitingForAi,
    saving: upload.saving,
    stored: upload.chapterSavedBadge,
    failed: upload.resultFailedBadge,
  };

  const stageStyles: Record<FileStage, string> = {
    queued: "bg-zinc-100 text-zinc-600",
    processing: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    saving: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    stored: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    failed: "bg-red-50 text-red-700 ring-1 ring-red-100",
  };

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:py-16">
      <Link
        href={`/${lang}`}
        className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        {upload.back}
      </Link>

      <header className="mt-5">
        <p className="text-sm font-medium text-emerald-700">{upload.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          {upload.title}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">
          {upload.intro}
        </p>
      </header>

      <form onSubmit={handleSubmit} aria-busy={busy} className="mt-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <label
            htmlFor="upload-subject"
            className="text-sm font-semibold text-zinc-900"
          >
            {upload.subjectLabel}
          </label>
          <select
            id="upload-subject"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            disabled={busy}
            className="mt-2 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 transition-colors focus-visible:border-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500 sm:max-w-sm"
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.code
                  ? `${subject.name} · ${subject.code}`
                  : subject.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-zinc-500">{upload.subjectHint}</p>
        </div>

        <div
          onDragEnter={handleDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`mt-4 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragActive
              ? "border-emerald-500 bg-emerald-50"
              : "border-zinc-300 bg-white"
          }`}
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <UploadIcon />
          </div>
          <p className="mt-4 text-base font-semibold text-zinc-900">
            {upload.dropTitle}
          </p>
          <p className="mt-1 text-sm text-zinc-500">{upload.dropSubtitle}</p>

          <input
            ref={inputRef}
            id="upload-files"
            type="file"
            accept={DOCUMENT_ACCEPT}
            multiple
            disabled={busy}
            onChange={handleInputChange}
            aria-describedby="upload-hint"
            className="sr-only"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {upload.chooseFile}
          </button>
          <p id="upload-hint" className="mt-3 text-xs text-zinc-500">
            {upload.hint}
          </p>
        </div>

        {selected.length > 0 ? (
          <section
            aria-label={upload.selectedFilesLabel}
            aria-live="polite"
            className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-900">
                {upload.selectedFilesLabel} ({selected.length})
              </h2>
              <button
                type="button"
                onClick={clearAll}
                disabled={busy}
                className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {upload.clearAll}
              </button>
            </div>

            <ul className="mt-4 space-y-2">
              {selected.map((file) => (
                <li
                  key={fileKey(file)}
                  className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2"
                >
                  <FileTypeBadge fileName={file.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {file.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(fileKey(file))}
                    disabled={busy}
                    aria-label={`${upload.remove} ${file.name}`}
                    className="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {upload.remove}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {formErrors.length > 0 ? (
          <ul
            role="alert"
            className="mt-4 space-y-1 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
          >
            {formErrors.map((message, index) => (
              <li key={`${index}-${message}`}>{message}</li>
            ))}
          </ul>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || !subjectId}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-400"
          >
            {busy ? (
              <>
                <Spinner className="h-4 w-4" />
                {saving ? upload.saving : upload.uploading}
              </>
            ) : (
              upload.submit
            )}
          </button>

          {processing ? (
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900"
            >
              {upload.cancel}
            </button>
          ) : null}

          <p className="text-xs text-zinc-500">
            {selected.length} / {MAX_FILES}
          </p>
        </div>
      </form>

      {processing ? (
        <section className="mt-8 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="sr-only" role="status" aria-live="polite">
            {upload.processingTitle} {upload.fileProgressLabel}{" "}
            {activeFilePosition} / {progressFiles.length}
          </p>

          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <Spinner className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                  {upload.processingTitle}
                </h2>
                <p className="text-xs font-medium text-zinc-500">
                  {upload.fileProgressLabel} {activeFilePosition} /{" "}
                  {progressFiles.length}
                </p>
              </div>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                {upload.processingHint}
              </p>
              <p className="mt-2 font-mono text-xs font-medium text-emerald-700 tabular-nums">
                {formatDuration(elapsed)}
              </p>
            </div>
          </div>

          <div
            role="progressbar"
            aria-label={upload.fileProgressLabel}
            aria-valuemin={0}
            aria-valuemax={progressFiles.length}
            aria-valuenow={finishedFiles}
            className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100"
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <ul className="mt-6 space-y-2">
            {progressFiles.map((item) => {
              const active = item.stage === "processing" || item.stage === "saving";

              return (
                <li
                  key={item.key}
                  data-stage={item.stage}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                    active
                      ? "border-emerald-200 bg-emerald-50/40"
                      : "border-zinc-100 bg-zinc-50"
                  }`}
                >
                  <FileTypeBadge fileName={item.filename} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {item.filename}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatFileSize(item.size)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${stageStyles[item.stage]}`}
                  >
                    {active ? <Spinner className="h-3.5 w-3.5" /> : null}
                    {stageLabels[item.stage]}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {outcomes && outcomes.length > 0 ? (
        <section aria-labelledby="results-heading" className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2
              id="results-heading"
              className="text-xl font-semibold tracking-tight text-zinc-900"
            >
              {upload.resultHeading}
            </h2>
            <p className="text-sm text-zinc-500">
              {successCount} / {outcomes.length} {upload.resultFilesUnit}
            </p>
          </div>

          {redirecting ? (
            <p
              role="status"
              aria-live="polite"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-100"
            >
              <Spinner className="h-4 w-4" />
              {upload.redirecting}
            </p>
          ) : null}

          {storedOutcomes.length > 0 ? (
            <section
              aria-labelledby="chapter-list-heading"
              className="mt-5 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3
                    id="chapter-list-heading"
                    className="text-sm font-semibold text-zinc-900"
                  >
                    {upload.chapterListHeading}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    {upload.chapterListHint}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100">
                  {storedOutcomes.length} {dict.subject.chapterUnit}
                </span>
              </div>

              <ol className="mt-4 space-y-2">
                {storedOutcomes.map((outcome, index) => {
                  const href = outcome.documentId
                    ? `/${lang}/subject/${subjectId}?chapter=${outcome.documentId}`
                    : null;
                  const rowClass =
                    "flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2";
                  const rowContent = (
                    <>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-900">
                          {chapterTitleForOutcome(outcome)}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {outcome.filename}
                          {outcome.result
                            ? ` · ${outcome.result.questions.length} ${dict.practice.questionsUnit}`
                            : ""}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
                        {upload.chapterSavedBadge}
                      </span>
                    </>
                  );

                  return (
                    <li
                      key={`${outcome.key}-${index}`}
                      data-document-id={outcome.documentId}
                    >
                      {href ? (
                        <Link
                          href={href}
                          className={`${rowClass} transition-colors hover:border-emerald-200 hover:bg-emerald-50/60`}
                        >
                          {rowContent}
                        </Link>
                      ) : (
                        <div className={rowClass}>{rowContent}</div>
                      )}
                    </li>
                  );
                })}
              </ol>

              {!redirecting ? (
                <Link
                  href={
                    firstStoredChapterId
                      ? `/${lang}/subject/${subjectId}?chapter=${firstStoredChapterId}`
                      : `/${lang}/subject/${subjectId}`
                  }
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                >
                  {upload.openSubjectPage}
                </Link>
              ) : null}
            </section>
          ) : null}

          <div className="mt-5 space-y-4">
            {outcomes.map((outcome, index) => (
              <OutcomeCard
                key={`${outcome.key}-${index}`}
                fileName={outcome.filename}
                fileSizeLabel={formatFileSize(outcome.size)}
                pages={outcome.pages}
                truncated={outcome.truncated === true}
                error={outcome.error}
                warning={outcome.warning}
                result={outcome.result}
                locale={lang}
                dict={dict}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
