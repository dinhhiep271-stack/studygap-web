"use client";

import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/spinner";
import {
  conceptSectionHeading,
  conceptSectionTitle,
  type ConceptCategory,
  type ConceptErrorCode,
  type ConceptExplanation,
  type ConceptLabels,
} from "@/lib/concept";
import {
  ConceptRequestError,
  fetchConceptExplanation,
} from "@/lib/concept-client";
import { localeNames, type Locale } from "@/lib/locales";

/**
 * AI explainer dialog for the key concepts of a chapter.
 *
 * It is mounted with `concept = null` while closed. Selecting a concept opens
 * it immediately in the loading state and calls `POST /api/concepts`; closing
 * the dialog (or choosing another concept) aborts the pending request.
 */

/**
 * Colour palette for the sections. The AI picks the section keys per subject
 * category, so the palette is rotated by position instead of keyed by name.
 * Ten entries keep every section of the medical contract visually distinct.
 */
const sectionPalette = [
  {
    card: "border-emerald-100 bg-emerald-50/60",
    badge: "bg-emerald-600 text-white",
    title: "text-emerald-900",
  },
  {
    card: "border-sky-100 bg-sky-50/60",
    badge: "bg-sky-600 text-white",
    title: "text-sky-900",
  },
  {
    card: "border-violet-100 bg-violet-50/60",
    badge: "bg-violet-600 text-white",
    title: "text-violet-900",
  },
  {
    card: "border-amber-100 bg-amber-50/60",
    badge: "bg-amber-500 text-white",
    title: "text-amber-900",
  },
  {
    card: "border-rose-100 bg-rose-50/60",
    badge: "bg-rose-600 text-white",
    title: "text-rose-900",
  },
  {
    card: "border-teal-100 bg-teal-50/60",
    badge: "bg-teal-600 text-white",
    title: "text-teal-900",
  },
  {
    card: "border-indigo-100 bg-indigo-50/60",
    badge: "bg-indigo-600 text-white",
    title: "text-indigo-900",
  },
  {
    card: "border-cyan-100 bg-cyan-50/60",
    badge: "bg-cyan-600 text-white",
    title: "text-cyan-900",
  },
  {
    card: "border-lime-100 bg-lime-50/60",
    badge: "bg-lime-600 text-white",
    title: "text-lime-900",
  },
  {
    card: "border-fuchsia-100 bg-fuchsia-50/60",
    badge: "bg-fuchsia-600 text-white",
    title: "text-fuchsia-900",
  },
] as const;

export function ConceptDialog({
  concept,
  lang,
  labels,
  context,
  category,
  onClose,
}: {
  /** Concept name to explain; `null` keeps the dialog closed. */
  concept: string | null;
  lang: Locale;
  labels: ConceptLabels;
  /** Related chapter material forwarded to the AI as grounding context. */
  context?: string;
  /** Section structure of the answer (`medical` for medical subjects). */
  category?: ConceptCategory;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [explanation, setExplanation] = useState<ConceptExplanation | null>(
    null,
  );
  const [errorCode, setErrorCode] = useState<ConceptErrorCode>("unknown");
  const [attempt, setAttempt] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // One request per concept/language/retry. Closing the dialog aborts it so a
  // slow answer never overwrites the state of the next concept.
  useEffect(() => {
    if (!concept) {
      return;
    }

    const controller = new AbortController();

    fetchConceptExplanation(
      { concept, lang, context, category },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }

        setExplanation(result);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setErrorCode(
          error instanceof ConceptRequestError ? error.code : "unknown",
        );
        setStatus("error");
      });

    return () => controller.abort();
  }, [attempt, category, concept, context, lang]);

  // Lock the page behind the modal and return focus to the concept card.
  useEffect(() => {
    if (!concept) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [concept]);

  // Escape closes the dialog; Tab cycles through its buttons.
  useEffect(() => {
    if (!concept) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;

      if (!dialog) {
        return;
      }

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [concept, onClose]);

  if (!concept) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-zinc-950/45 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="concept-dialog-title"
        aria-busy={status === "loading" ? "true" : undefined}
        className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
      >
        <div className="flex items-start gap-4 border-b border-zinc-100 bg-emerald-50/70 px-6 py-5">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-lg text-white shadow-sm"
          >
            ✦
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">
              {labels.dialogEyebrow}
            </p>
            <h2
              id="concept-dialog-title"
              className="mt-1 text-xl font-semibold tracking-tight break-words text-zinc-900 sm:text-2xl"
            >
              {concept}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={labels.close}
            title={labels.close}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4"
            >
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {status === "loading" ? (
            <div role="status" aria-live="polite" className="py-6 text-center">
              <Spinner className="mx-auto h-9 w-9 text-emerald-600" />
              <p className="mt-4 text-sm font-semibold text-zinc-900">
                {labels.loading}
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-zinc-500">
                {labels.loadingHint}
              </p>
              <div
                aria-hidden="true"
                className="mx-auto mt-6 max-w-md animate-pulse space-y-3"
              >
                <div className="h-3 rounded-full bg-zinc-100" />
                <div className="h-3 w-11/12 rounded-full bg-zinc-100" />
                <div className="h-3 w-4/5 rounded-full bg-zinc-100" />
              </div>
            </div>
          ) : status === "error" ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-5 py-4"
            >
              <p className="text-sm font-semibold text-red-800">
                {labels.errorTitle}
              </p>
              <p className="mt-1 text-sm leading-6 text-red-700">
                {labels.errors[errorCode]}
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatus("loading");
                  setAttempt((value) => value + 1);
                }}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
              >
                {labels.retry}
              </button>
            </div>
          ) : explanation ? (
            <div className="space-y-3">
              <p className="rounded-lg border border-zinc-100 bg-zinc-50 px-3.5 py-2.5 text-xs leading-5 text-zinc-500">
                {labels.bilingualHint}
              </p>

              {explanation.sections.map((section, index) => {
                const style = sectionPalette[index % sectionPalette.length];
                const title = conceptSectionTitle(section.key);
                // The card heading is the raw JSON key in upper case
                // (`symptome` → `SYMPTOME`); the German caption stays identical
                // to the key, so the key doubles as the German title.
                const heading = conceptSectionHeading(section.key);
                const hasGerman = section.de.length > 0;
                const hasVietnamese = section.vi.length > 0;

                return (
                  <section
                    key={`${section.key}-${index}`}
                    aria-label={
                      title.de === title.vi
                        ? heading
                        : `${heading} / ${title.vi}`
                    }
                    className={`rounded-xl border px-4 py-3.5 ${style.card}`}
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        aria-hidden="true"
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${style.badge}`}
                      >
                        {index + 1}
                      </span>
                      <h3
                        className={`text-sm font-semibold tracking-wide uppercase ${style.title}`}
                      >
                        {heading}
                      </h3>
                      {title.vi !== title.de ? (
                        <span className="text-[11px] font-medium text-zinc-500">
                          {title.vi}
                        </span>
                      ) : null}
                      <span
                        aria-hidden="true"
                        className="ml-auto rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase ring-1 ring-white/60"
                      >
                        DE · VI
                      </span>
                    </div>

                    <div className="mt-2.5 space-y-2.5">
                      <div>
                        <p
                          lang="de"
                          className="text-[11px] font-bold tracking-wide text-zinc-700 uppercase"
                        >
                          {localeNames.de} · {title.de}
                        </p>
                        <p
                          lang="de"
                          className={`mt-0.5 text-sm leading-7 whitespace-pre-line ${
                            hasGerman
                              ? "font-normal text-zinc-800"
                              : "text-zinc-500 italic"
                          }`}
                        >
                          {hasGerman ? section.de : labels.emptySection}
                        </p>
                      </div>

                      <div className="rounded-lg bg-white/70 px-3 py-2.5 ring-1 ring-white/70">
                        <p
                          lang="vi"
                          className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase italic"
                        >
                          {localeNames.vi} · {title.vi}
                        </p>
                        <p
                          lang="vi"
                          className={`mt-0.5 text-sm leading-7 whitespace-pre-line italic ${
                            hasVietnamese ? "text-zinc-600" : "text-zinc-400"
                          }`}
                        >
                          {hasVietnamese ? section.vi : labels.emptySection}
                        </p>
                      </div>
                    </div>
                  </section>
                );
              })}

              <p className="pt-1 text-xs leading-5 text-zinc-400">
                {labels.disclaimer}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end border-t border-zinc-100 bg-zinc-50/80 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            {labels.close}
          </button>
        </div>
      </div>
    </div>
  );
}


