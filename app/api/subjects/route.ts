import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { createSubject } from "@/lib/subject-catalog";

/**
 * POST /api/subjects
 *
 * Legt ein neues Fach für den angemeldeten Nutzer an.
 * Body: `{ nameDe, name, description? }` – der deutsche Name ist Pflicht und
 * liefert den Slug (`id`) der URL, der vietnamesische Name ist ebenfalls Pflicht.
 *
 * Antwort: `{ subject: { id, nameDe, name, description } }` mit Status 201.
 * Fehler: `{ error: "invalid-body" | "invalid-name-de" | "invalid-name" |
 * "invalid-description" | "save-failed" }`.
 */

/** Genug für „Einführung in das deutsche Steuerrecht“, aber kein Aufsatz. */
const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 600;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/** Trimmt und kollabiert Leerraum: "  BWL   I  " → "BWL I". */
function readText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("invalid-body");
  }

  if (!isRecord(body)) {
    return badRequest("invalid-body");
  }

  const nameDe = readText(body.nameDe);
  const name = readText(body.name);
  // Die Beschreibung darf Absätze enthalten, deshalb nur aussen trimmen.
  const description =
    typeof body.description === "string" ? body.description.trim() : "";

  if (!nameDe) {
    return badRequest("invalid-name-de");
  }

  if (!name) {
    return badRequest("invalid-name");
  }

  if (nameDe.length > MAX_NAME_LENGTH) {
    return badRequest("invalid-name-de");
  }

  if (name.length > MAX_NAME_LENGTH) {
    return badRequest("invalid-name");
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return badRequest("invalid-description");
  }

  try {
    const userId = await getCurrentUserId();
    const subject = await createSubject({ userId, nameDe, name, description });

    return NextResponse.json(
      {
        subject: {
          id: subject.id,
          nameDe: subject.name.de,
          name: subject.name.vi,
          description: subject.summary.vi,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Could not create the subject.", error);

    return NextResponse.json({ error: "save-failed" }, { status: 500 });
  }
}
