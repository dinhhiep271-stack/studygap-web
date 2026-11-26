"use client";

import { Fragment } from "react";
import type { CurriculumQuestion } from "@/lib/curriculum";
import type { Dictionary } from "@/lib/i18n";
import {
  answersMatch,
  blankCount,
  correctAnswerLabel,
  correctChoiceKeys,
  correctTruth,
  practiceFormatOf,
  tableCellKey,
  type QuestionAnswer,
} from "@/lib/practice";

type PracticeLabels = Dictionary["practice"];

/**
 * Renders the answer controls for any of the six exercise formats. The learner
 * answer lives in the parent (`QuestionAnswer`), so the same component powers the
 * practice center (check/retry per question) and the exam runner (submit once).
 */
export function QuestionAnswerInput({
  question,
  answer,
  onChange,
  labels,
  reveal = false,
  disabled = false,
}: {
  question: CurriculumQuestion;
  answer: QuestionAnswer;
  onChange: (patch: Partial<QuestionAnswer>) => void;
  labels: PracticeLabels;
  /** Colour correct/incorrect inputs (after "check" or after submitting). */
  reveal?: boolean;
  disabled?: boolean;
}) {
  const format = practiceFormatOf(question);
  const isChoice =
    format === "single_choice" || format === "multiple_response";
  const correctKeys = correctChoiceKeys(question);
  const expectedTruth = correctTruth(question);
  const blankValues = Array.from(
    { length: blankCount(question) },
    (_, index) => answer.blanks[index] ?? "",
  );
  const inlineBlanks = question.question.split(/_{2,}/).length - 1;

  function setBlank(index: number, value: string) {
    const next = [...blankValues];
    next[index] = value;
    onChange({ blanks: next });
  }

  function toggleKey(key: string) {
    if (format === "single_choice") {
      onChange({ keys: [key] });
      return;
    }

    onChange({
      keys: answer.keys.includes(key)
        ? answer.keys.filter((item) => item !== key)
        : [...answer.keys, key],
    });
  }

  function renderStatement() {
    if (format !== "fill_in_the_blank") {
      return question.question ? (
        <p className="mt-3 text-sm leading-6 font-semibold whitespace-pre-line text-zinc-900">
          {question.question}
        </p>
      ) : null;
    }

    const parts = question.question.split(/_{2,}/);

    if (parts.length < 2) {
      return question.question ? (
        <p className="mt-3 text-sm leading-6 font-semibold whitespace-pre-line text-zinc-900">
          {question.question}
        </p>
      ) : null;
    }

    return (
      <p className="mt-3 text-sm leading-9 font-semibold whitespace-pre-line text-zinc-900">
        {parts.map((part, index) => {
          const value = blankValues[index] ?? "";
          const blankOk = reveal
            ? answersMatch(question.answerList[index] ?? "", value)
            : null;

          return (
            <Fragment key={index}>
              {part}
              {index < parts.length - 1 ? (
                <input
                  aria-label={`${labels.keywordPlaceholder} ${index + 1}`}
                  value={value}
                  disabled={disabled}
                  onChange={(event) => setBlank(index, event.target.value)}
                  placeholder={labels.keywordPlaceholder}
                  className={`mx-1 inline-block h-8 w-28 rounded-lg border-b-2 bg-emerald-50/40 px-2 text-center text-sm font-semibold text-zinc-900 focus:outline-none sm:w-32 ${
                    blankOk === null
                      ? "border-emerald-300 focus:border-emerald-600"
                      : blankOk
                        ? "border-emerald-500 text-emerald-800"
                        : "border-red-400 bg-red-50/60 text-red-700"
                  }`}
                />
              ) : null}
            </Fragment>
          );
        })}
      </p>
    );
  }

  function renderChoice() {
    return (
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {question.options.map((option) => {
          const key = option.key.trim().toUpperCase();
          const isSelected = answer.keys.includes(key);
          const showCorrect = reveal && correctKeys.includes(key);
          const showWrong = reveal && isSelected && !correctKeys.includes(key);

          return (
            <li key={key}>
              <button
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                onClick={() => toggleKey(key)}
                className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm leading-6 transition ${
                  showCorrect
                    ? "border-emerald-400 bg-emerald-50 text-emerald-950"
                    : showWrong
                      ? "border-red-300 bg-red-50 text-red-950"
                      : isSelected
                        ? "border-emerald-500 bg-emerald-50/60 text-zinc-900"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-emerald-300"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    isSelected || showCorrect
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {key}
                </span>
                <span>{option.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  function renderCalculation() {
    return (
      <div className="mt-3 space-y-3">
        {question.given.length > 0 || question.formula ? (
          <div className="rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-100">
            {question.given.length > 0 ? (
              <>
                <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  {labels.given}
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-zinc-700">
                  {question.given.map((item, index) => (
                    <li key={`${index}-${item}`}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {question.formula ? (
              <p className="mt-2 text-sm leading-6 text-zinc-700">
                <span className="font-semibold text-zinc-900">
                  {labels.formula}:
                </span>{" "}
                <span className="font-mono">{question.formula}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        <input
          type="text"
          inputMode="decimal"
          value={answer.text}
          disabled={disabled}
          onChange={(event) => onChange({ text: event.target.value })}
          placeholder={labels.inputPlaceholder}
          aria-label={labels.inputPlaceholder}
          className={`h-11 w-full max-w-xs rounded-xl border bg-white px-3 text-sm font-medium text-zinc-900 focus:outline-none ${
            reveal
              ? answersMatch(question.answerText, answer.text)
                ? "border-emerald-400 ring-1 ring-emerald-300"
                : "border-red-300 ring-1 ring-red-200"
              : "border-zinc-300 focus:border-emerald-500"
          }`}
        />
      </div>
    );
  }

  function renderExtraBlanks() {
    const extra = blankValues.slice(Math.max(inlineBlanks, 0));

    if (extra.length === 0) {
      return null;
    }

    return (
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {extra.map((value, index) => {
          const blankIndex = Math.max(inlineBlanks, 0) + index;
          const blankOk = reveal
            ? answersMatch(question.answerList[blankIndex] ?? "", value)
            : null;

          return (
            <li key={blankIndex} className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-600">
                {blankIndex + 1}
              </span>
              <input
                aria-label={`${labels.keywordPlaceholder} ${blankIndex + 1}`}
                value={value}
                disabled={disabled}
                onChange={(event) => setBlank(blankIndex, event.target.value)}
                placeholder={labels.keywordPlaceholder}
                className={`h-9 w-full rounded-lg border bg-white px-3 text-sm font-medium text-zinc-900 focus:outline-none ${
                  blankOk === null
                    ? "border-zinc-300 focus:border-emerald-500"
                    : blankOk
                      ? "border-emerald-400"
                      : "border-red-300"
                }`}
              />
            </li>
          );
        })}
      </ul>
    );
  }

  function renderTrueFalse() {
    return (
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {[true, false].map((value) => {
          const label = value ? labels.trueLabel : labels.falseLabel;
          const isSelected = answer.truth === value;
          const showCorrect = reveal && expectedTruth === value;
          const showWrong = reveal && isSelected && expectedTruth !== value;

          return (
            <button
              key={String(value)}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              onClick={() => onChange({ truth: value })}
              className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${
                showCorrect
                  ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                  : showWrong
                    ? "border-red-300 bg-red-50 text-red-900"
                    : isSelected
                      ? "border-emerald-500 bg-emerald-50/60 text-zinc-900"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-emerald-300"
              }`}
            >
              <span aria-hidden="true" className="text-base">
                {value ? "✓" : "✗"}
              </span>
              {label}
            </button>
          );
        })}
      </div>
    );
  }



  function renderTable() {
    if (question.tableRows.length === 0) {
      return null;
    }

    const columnCount = question.tableRows.reduce(
      (max, row) => Math.max(max, row.length),
      question.tableHeaders.length,
    );

    return (
      <div className="mt-3">
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            {question.tableHeaders.length > 0 ? (
              <thead className="bg-zinc-50">
                <tr>
                  {question.tableHeaders.map((header, index) => (
                    <th
                      key={`${index}-${header}`}
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-semibold tracking-wide text-zinc-600 uppercase"
                    >
                      {header || "—"}
                    </th>
                  ))}
                </tr>
              </thead>
            ) : null}
            <tbody className="divide-y divide-zinc-100 bg-white">
              {question.tableRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.from({ length: columnCount }, (_, columnIndex) => {
                    const value = row[columnIndex] ?? "";
                    const cell = question.tableAnswers.find(
                      (item) =>
                        item.row === rowIndex && item.column === columnIndex,
                    );

                    if (!cell) {
                      return (
                        <td
                          key={columnIndex}
                          className="px-3 py-2 align-middle text-zinc-700"
                        >
                          {value || "—"}
                        </td>
                      );
                    }

                    const cellKey = tableCellKey(rowIndex, columnIndex);
                    const cellValue = answer.table[cellKey] ?? "";
                    const cellOk = reveal
                      ? answersMatch(cell.value, cellValue)
                      : null;

                    return (
                      <td key={columnIndex} className="px-3 py-2 align-middle">
                        <input
                          type="text"
                          value={cellValue}
                          disabled={disabled}
                          onChange={(event) =>
                            onChange({
                              table: {
                                ...answer.table,
                                [cellKey]: event.target.value,
                              },
                            })
                          }
                          placeholder={labels.inputPlaceholder}
                          aria-label={`${labels.row} ${rowIndex + 1}`}
                          className={`h-9 w-full min-w-24 rounded-lg border bg-white px-2 text-sm font-medium text-zinc-900 focus:outline-none ${
                            cellOk === null
                              ? "border-amber-300 bg-amber-50/40 focus:border-emerald-500"
                              : cellOk
                                ? "border-emerald-400 bg-emerald-50/40"
                                : "border-red-300 bg-red-50/40"
                          }`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-zinc-500">{labels.tableHint}</p>
      </div>
    );
  }

  return (
    <>
      {renderStatement()}
      <div className="mt-3">
        {isChoice ? renderChoice() : null}
        {format === "calculation" ? renderCalculation() : null}
        {format === "fill_in_the_blank" ? renderExtraBlanks() : null}
        {format === "true_false" ? renderTrueFalse() : null}
        {format === "table" ? renderTable() : null}
      </div>
    </>
  );
}

/**
 * Solution + explanation block shown after a question was graded (practice
 * "check" or exam submission).
 */
export function QuestionFeedback({
  question,
  labels,
  isCorrect,
}: {
  question: CurriculumQuestion;
  labels: PracticeLabels;
  isCorrect: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-result={isCorrect ? "correct" : "incorrect"}
      className={`mt-4 rounded-xl border px-4 py-3 ${
        isCorrect
          ? "border-emerald-200 bg-emerald-50/70"
          : "border-red-200 bg-red-50/70"
      }`}
    >
      <p
        className={`text-sm font-semibold ${
          isCorrect ? "text-emerald-800" : "text-red-800"
        }`}
      >
        {isCorrect ? labels.correct : labels.incorrect}
      </p>
      <p className="mt-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
        {labels.correctAnswer}
      </p>
      <p className="mt-0.5 text-sm leading-6 font-medium text-zinc-800">
        {correctAnswerLabel(question, labels)}
      </p>
      {question.explanation ? (
        <>
          <p className="mt-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            {labels.explanation}
          </p>
          <p className="mt-0.5 text-sm leading-6 whitespace-pre-line text-zinc-700">
            {question.explanation}
          </p>
        </>
      ) : null}
    </div>
  );
}
