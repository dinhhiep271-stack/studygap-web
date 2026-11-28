"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Spinner } from "@/components/spinner";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/locales";

/** Muss zu `app/api/subjects/route.ts` passen; hier für sofortige Rückmeldung. */
const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 600;

const inputClassName =
  "mt-2 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 transition-colors placeholder:text-zinc-400 focus-visible:border-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500";

/** Antwort von `POST /api/subjects` (nur die Felder, die die UI braucht). */
type CreateSubjectResponse = {
  subject?: { id?: unknown };
  error?: unknown;
};

type SubjectFormProps = {
  lang: Locale;
  dict: Dictionary;
};

/**
 * Formular für „Neues Fach hinzufügen“.
 *
 * Nach dem Speichern leitet es direkt zum Upload weiter, damit das neue Fach
 * mit `?subject=<id>` vorausgewählt ist – das Fach existiert zu diesem
 * Zeitpunkt bereits in der Datenbank, taucht also auch in der Liste auf.
 */
export function SubjectForm({ lang, dict }: SubjectFormProps) {
  const labels = dict.newSubject;
  const router = useRouter();
  const [nameDe, setNameDe] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    const trimmedNameDe = nameDe.replace(/\s+/g, " ").trim();
    const trimmedName = name.replace(/\s+/g, " ").trim();
    const trimmedDescription = description.trim();

    if (!trimmedNameDe) {
      setError(labels.errors.nameDe);
      return;
    }

    if (!trimmedName) {
      setError(labels.errors.nameVi);
      return;
    }

    if (
      trimmedNameDe.length > MAX_NAME_LENGTH ||
      trimmedName.length > MAX_NAME_LENGTH ||
      trimmedDescription.length > MAX_DESCRIPTION_LENGTH
    ) {
      setError(labels.errors.tooLong);
      return;
    }

    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameDe: trimmedNameDe,
          name: trimmedName,
          description: trimmedDescription,
        }),
      });

      const payload = (await response
        .json()
        .catch(() => null)) as CreateSubjectResponse | null;

      if (!response.ok) {
        const code = typeof payload?.error === "string" ? payload.error : "";
        const message =
          {
            "invalid-name-de": labels.errors.nameDe,
            "invalid-name": labels.errors.nameVi,
            "invalid-description": labels.errors.tooLong,
          }[code] ?? labels.errors.save;

        setError(message);
        setPending(false);
        return;
      }

      const subjectId =
        typeof payload?.subject?.id === "string" ? payload.subject.id : "";

      if (!subjectId) {
        setError(labels.errors.save);
        setPending(false);
        return;
      }

      // Spinner bleibt sichtbar, während die Upload-Seite lädt.
      router.push(`/${lang}/upload?subject=${encodeURIComponent(subjectId)}`);
    } catch (fetchError) {
      console.error("Could not create the subject.", fetchError);
      setError(labels.errors.network);
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={pending} className="mt-8">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <label
            htmlFor="subject-name-de"
            className="text-sm font-semibold text-zinc-900"
          >
            {labels.nameDeLabel}
          </label>
          <input
            id="subject-name-de"
            name="nameDe"
            type="text"
            required
            spellCheck={false}
            value={nameDe}
            onChange={(event) => setNameDe(event.target.value)}
            disabled={pending}
            placeholder={labels.nameDePlaceholder}
            className={inputClassName}
          />
          <p className="mt-2 text-xs text-zinc-500">{labels.nameDeHint}</p>
        </div>

        <div className="mt-4">
          <label
            htmlFor="subject-name-vi"
            className="text-sm font-semibold text-zinc-900"
          >
            {labels.nameViLabel}
          </label>
          <input
            id="subject-name-vi"
            name="name"
            type="text"
            required
            spellCheck={false}
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={pending}
            placeholder={labels.nameViPlaceholder}
            className={inputClassName}
          />
          <p className="mt-2 text-xs text-zinc-500">{labels.nameViHint}</p>
        </div>

        <div className="mt-4">
          <label
            htmlFor="subject-description"
            className="text-sm font-semibold text-zinc-900"
          >
            {labels.descriptionLabel}{" "}
            <span className="font-normal text-zinc-500">
              ({labels.optional})
            </span>
          </label>
          <textarea
            id="subject-description"
            name="description"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={pending}
            placeholder={labels.descriptionPlaceholder}
            className={`${inputClassName} h-auto py-2.5 leading-6`}
          />
          <p className="mt-2 text-xs text-zinc-500">
            {labels.descriptionHint}
          </p>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-400"
        >
          {pending ? (
            <>
              <Spinner className="h-4 w-4" />
              {labels.submitting}
            </>
          ) : (
            labels.submit
          )}
        </button>

        <Link
          href={`/${lang}`}
          className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          {labels.cancel}
        </Link>
      </div>
    </form>
  );
}
