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
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/locales";
import { parseCurriculum, type ParsedCurriculum } from "@/lib/curriculum";
import { DOCUMENT_ACCEPT, isSupportedDocument } from "@/lib/file-formats";
import { FileTypeBadge } from "@/components/file-type-badge";
import { OutcomeCard } from "./outcome-card";

/** Must match MAX_UPLOAD_BYTES in the FastAPI service (main.py). */
const MAX_FILE_SIZE = 20 * 1024 * 1024;
/** Must match MAX_BATCH_FILES in the FastAPI service (main.py). */
const MAX_FILES = 10;

/**
 * Python/FastAPI service (studygap-ai) that turns documents (PDF, Word, Excel,
 * plain text and CSV) into course plans. It runs on Render
 * (https://studygap-ai.onrender.com); set NEXT_PUBLIC_STUDYGAP_API_URL to
 * override the address, e.g. when running the API locally.
 */
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_STUDYGAP_API_URL ?? "https://studygap-ai.onrender.com"
).replace(/\/+$/, "");
const PROCESS_DOCUMENT_URL = `${API_BASE_URL}/process-document`;

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
  /** Raw AI payload, sent to /api/documents unchanged. */
  raw?: unknown;
  result?: ParsedCurriculum;
};

/** One option of the subject picker on the upload page. */
export type SubjectOption = {
  id: string;
  name: string;
  code: string;
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
 * Stores one AI result through `/api/documents`. A failure is not fatal: the
 * parsed result stays visible, the outcome only gets a warning.
 */
async function persistOutcome(
  outcome: FileOutcome,
  subjectId: string,
  language: Locale,
  saveErrorMessage: string,
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
    });

    if (!response.ok) {
      return { ...outcome, warning: saveErrorMessage };
    }

    return outcome;
  } catch {
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

  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [selected, setSelected] = useState<File[]>([]);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [outcomes, setOutcomes] = useState<FileOutcome[] | null>(null);

  // Tick every second while the request runs so the waiting screen shows how
  // long the AI has been working. One request handles the whole batch.
  useEffect(() => {
    if (!processing) {
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [processing]);

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
    const formData = new FormData();

    // The FastAPI service expects the same multipart field ("files") repeated
    // once per document — .pdf, .docx, .xlsx, .txt and .csv are all accepted
    // and detected by their file name — and answers with a JSON array in the
    // same order. The name is sent explicitly so the API can sniff the format
    // even when the browser reports an empty MIME type.
    for (const file of filesToSend) {
      formData.append("files", file, file.name);
    }

    // Output language of the generated curriculum (de | vi).
    formData.append("lang", lang);

    const controller = new AbortController();
    abortRef.current = controller;
    setFormErrors([]);
    setOutcomes(null);
    setRedirecting(false);
    setElapsed(0);
    setProcessing(true);

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

      const results = Array.isArray(payload)
        ? (payload as ProcessDocumentResponse[])
        : [];

      // Pair the n-th file with the n-th element of the response array.
      let nextOutcomes = filesToSend.map((file, index) =>
        toOutcome(file, results[index], upload.errors.unexpected),
      );

      // Persist every successful result. Only redirect once all selected files
      // were processed *and* stored, otherwise the cards explain what failed.
      if (nextOutcomes.some((outcome) => outcome.ok)) {
        setSaving(true);
        nextOutcomes = await Promise.all(
          nextOutcomes.map((outcome) =>
            outcome.ok
              ? persistOutcome(outcome, subjectId, lang, upload.errors.save)
              : Promise.resolve(outcome),
          ),
        );
        setSaving(false);
      }

      setOutcomes(nextOutcomes);
      setSelected([]);

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      const allStored =
        nextOutcomes.length > 0 &&
        nextOutcomes.every((outcome) => outcome.ok && !outcome.warning);

      if (allStored) {
        setRedirecting(true);
        router.push(`/${lang}/subject/${subjectId}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return; // Cancelled by the user: keep the selection for another try.
      }

      const message =
        error instanceof TypeError
          ? upload.errors.network
          : error instanceof Error && error.message
            ? error.message
            : upload.errors.unexpected;

      // A failed request means no file was processed: one error card per file.
      setOutcomes(
        filesToSend.map((file) => ({
          key: fileKey(file),
          filename: file.name,
          size: file.size,
          ok: false,
          error: message,
        })),
      );
    } finally {
      abortRef.current = null;
      setProcessing(false);
      setSaving(false);
      setElapsed(0);
    }
  }

  const successCount = outcomes?.filter((outcome) => outcome.ok).length ?? 0;
  const busy = processing || saving;

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
                {subject.name} · {subject.code}
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
            {upload.processingTitle} {upload.waitingForAi}
          </p>

          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <Spinner className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                {upload.processingTitle}
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                {upload.processingHint}
              </p>
              <p className="mt-2 font-mono text-xs font-medium text-emerald-700 tabular-nums">
                {formatDuration(elapsed)}
              </p>
            </div>
          </div>

          <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-emerald-500" />
          </div>

          <ul className="mt-6 space-y-2">
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
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <Spinner className="h-3.5 w-3.5" />
                  {upload.waitingForAi}
                </span>
              </li>
            ))}
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
                dict={dict}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
