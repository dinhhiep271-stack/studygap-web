import type { ReactNode } from "react";
import type { ConceptLabels } from "@/lib/concept";
import type {
  CurriculumLabels,
  CurriculumQuestion,
  CurriculumQuestionType,
  ParsedCurriculum,
  TableAnswer,
} from "@/lib/curriculum";
import { keyConceptsForLocale, summaryForLocale } from "@/lib/curriculum";
import type { Locale } from "@/lib/locales";
import { correctChoiceKeys, correctTruth } from "@/lib/practice";

/**
 * Read-only rendering of the AI curriculum (`teaching` + `questions`).
 * Shared by the upload result card and the subject detail page so both show
 * the same content in the same order:
 * summary → key concepts → formulas → examples → questions.
 */

const questionTypeStyles: Record<CurriculumQuestionType, string> = {
  multiple_choice: "bg-sky-50 text-sky-700 ring-sky-100",
  multiple_response: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  calculation: "bg-violet-50 text-violet-700 ring-violet-100",
  fill_in_the_blank: "bg-amber-50 text-amber-700 ring-amber-100",
  true_false: "bg-rose-50 text-rose-700 ring-rose-100",
  table: "bg-teal-50 text-teal-700 ring-teal-100",
};

export function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="mt-8">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-4 w-1 rounded-full bg-emerald-500"
        />
        <h4 className="text-sm font-semibold tracking-wide text-zinc-900 uppercase">
          {title}
        </h4>
        {count !== undefined ? (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
            {count}
          </span>
        ) : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-3 text-sm leading-6 text-zinc-500">
      {children}
    </p>
  );
}

function findTableAnswer(answers: TableAnswer[], row: number, column: number) {
  return answers.find(
    (answer) => answer.row === row && answer.column === column,
  );
}

function QuestionTable({ question }: { question: CurriculumQuestion }) {
  if (question.tableRows.length === 0) {
    return null;
  }

  const columnCount = question.tableRows.reduce(
    (max, row) => Math.max(max, row.length),
    question.tableHeaders.length,
  );

  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200">
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
                const answer = findTableAnswer(
                  question.tableAnswers,
                  rowIndex,
                  columnIndex,
                );

                return (
                  <td
                    key={columnIndex}
                    className={`px-3 py-2 align-top ${
                      answer
                        ? "bg-emerald-50 font-semibold text-emerald-800"
                        : value.includes("___")
                          ? "bg-amber-50 font-mono text-amber-700"
                          : "text-zinc-700"
                    }`}
                  >
                    {answer ? answer.value : value || "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnswerContent({
  question,
  labels,
}: {
  question: CurriculumQuestion;
  labels: CurriculumLabels;
}) {
  if (
    question.type === "multiple_choice" ||
    question.type === "multiple_response"
  ) {
    const answers = correctChoiceKeys(question).map(
      (key) =>
        question.options.find(
          (option) => option.key.trim().toUpperCase() === key,
        )?.label ?? key,
    );

    return (
      <p className="text-sm leading-6 font-medium text-emerald-950">
        {answers.length > 0 ? answers.join(" · ") : question.answerText || "—"}
      </p>
    );
  }

  if (question.type === "true_false") {
    const truth = correctTruth(question);

    return (
      <p className="text-sm leading-6 font-medium text-emerald-950">
        {truth === null
          ? question.answerText || "—"
          : truth
            ? labels.trueLabel
            : labels.falseLabel}
      </p>
    );
  }

  if (question.type === "fill_in_the_blank") {
    if (question.answerList.length === 0) {
      return <p className="text-sm text-emerald-900">—</p>;
    }

    return (
      <ol className="list-decimal space-y-1 pl-5 text-sm leading-6 font-medium text-emerald-950">
        {question.answerList.map((answer, index) => (
          <li key={`${index}-${answer}`}>{answer}</li>
        ))}
      </ol>
    );
  }

  if (question.type === "table") {
    if (question.tableAnswers.length === 0) {
      return <p className="text-sm text-emerald-900">—</p>;
    }

    return (
      <ul className="space-y-1 text-sm leading-6 font-medium text-emerald-950">
        {question.tableAnswers.map((answer, index) => {
          const header = question.tableHeaders[answer.column];

          return (
            <li key={`${answer.row}-${answer.column}-${index}`}>
              {labels.row} {answer.row + 1}
              {header ? ` · ${header}` : ""}: {answer.value}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <p className="text-sm leading-6 font-medium text-emerald-950">
      {question.answerText || "—"}
    </p>
  );
}

function QuestionBody({
  question,
  labels,
}: {
  question: CurriculumQuestion;
  labels: CurriculumLabels;
}) {
  if (
    (question.type === "multiple_choice" ||
      question.type === "multiple_response") &&
    question.options.length > 0
  ) {
    const correctKeys = correctChoiceKeys(question);

    return (
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {question.options.map((option) => {
          const isAnswer = correctKeys.includes(
            option.key.trim().toUpperCase(),
          );

          return (
            <li
              key={option.key}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm leading-6 ${
                isAnswer
                  ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                  : "border-zinc-200 bg-zinc-50/60 text-zinc-700"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  isAnswer
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-zinc-600 ring-1 ring-zinc-200"
                }`}
              >
                {option.key}
              </span>
              <span>{option.label}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  if (question.type === "true_false") {
    const truth = correctTruth(question);

    return (
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {[true, false].map((value) => {
          const isAnswer = truth === value;
          const label = value ? labels.trueLabel : labels.falseLabel;

          return (
            <span
              key={String(value)}
              className={`flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold ${
                isAnswer
                  ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                  : "border-zinc-200 bg-zinc-50/60 text-zinc-600"
              }`}
            >
              {label}
            </span>
          );
        })}
      </div>
    );
  }

  if (
    question.type === "calculation" &&
    (question.given.length > 0 || question.formula)
  ) {
    return (
      <div className="mt-3 rounded-lg bg-zinc-50 px-4 py-3 ring-1 ring-zinc-100">
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
    );
  }

  if (question.type === "table") {
    return <QuestionTable question={question} />;
  }

  return null;
}

export function CurriculumContent({
  curriculum,
  labels,
  locale,
  showQuestions = true,
  conceptLabels,
  onConceptSelect,
}: {
  curriculum: ParsedCurriculum;
  labels: CurriculumLabels;
  /** Active UI language; selects `summary_de`/`summary_vi`, `concepts_de`/`concepts_vi`. */
  locale: Locale;
  /** The subject workspace renders questions in the practice center instead. */
  showQuestions?: boolean;
  /** Captions for the clickable concept cards (subject page only). */
  conceptLabels?: ConceptLabels;
  /** When set, key concepts become buttons that open the AI explainer. */
  onConceptSelect?: (concept: string) => void;
}) {
  // Bilingual teaching: pick the active language so a DE ↔ VI switch updates the
  // section immediately. Legacy documents fall back to their single-language text.
  const summary = summaryForLocale(curriculum, locale);
  const keyConcepts = keyConceptsForLocale(curriculum, locale);

  return (
    <>
      <Section title={labels.summary}>
        {summary ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-5 py-4">
            <p className="text-sm leading-7 whitespace-pre-line text-zinc-700">
              {summary}
            </p>
          </div>
        ) : (
          <EmptyNote>{labels.emptySummary}</EmptyNote>
        )}
      </Section>

      <Section
        title={labels.concepts}
        count={keyConcepts.length > 0 ? keyConcepts.length : undefined}
      >
        {keyConcepts.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {keyConcepts.map((concept, index) => {
              // On the subject page the cards open the AI explainer; the upload
              // preview keeps them read-only because it has no API context.
              const interactive = conceptLabels && onConceptSelect;

              const content = (
                <>
                  <span
                    aria-hidden="true"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                      interactive
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-zinc-900">
                      {concept.name}
                    </span>
                    {concept.explanation ? (
                      <span className="mt-1 block text-sm leading-6 text-zinc-600">
                        {concept.explanation}
                      </span>
                    ) : null}
                    {interactive ? (
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        {conceptLabels.action}
                        <span aria-hidden="true">→</span>
                      </span>
                    ) : null}
                  </span>
                  {interactive ? (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="none"
                      className="mt-1 h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-emerald-600"
                    >
                      <path
                        d="M7.5 4.5L13 10l-5.5 5.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </>
              );

              return (
                <li key={`${index}-${concept.name}`} className="min-w-0">
                  {conceptLabels && onConceptSelect ? (
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      onClick={() => onConceptSelect(concept.name)}
                      className="group flex h-full w-full items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyNote>{labels.emptyConcepts}</EmptyNote>
        )}
      </Section>

      <Section
        title={labels.formulas}
        count={
          curriculum.formulas.length > 0
            ? curriculum.formulas.length
            : undefined
        }
      >
        {curriculum.formulas.length > 0 ? (
          <ul className="space-y-3">
            {curriculum.formulas.map((formula, index) => (
              <li
                key={`${index}-${formula.formula}`}
                className="rounded-xl border border-zinc-200 bg-white p-4"
              >
                {formula.formula ? (
                  <p className="rounded-lg bg-zinc-50 px-3 py-2 font-mono text-sm font-semibold break-words text-zinc-900 ring-1 ring-zinc-100">
                    {formula.formula}
                  </p>
                ) : null}

                {formula.description ? (
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {formula.description}
                  </p>
                ) : null}

                {formula.symbols.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                      {labels.symbols}
                    </p>
                    <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                      {formula.symbols.map((symbol, symbolIndex) => (
                        <div
                          key={`${symbolIndex}-${symbol.symbol}`}
                          className="flex items-start gap-2 rounded-lg bg-zinc-50 px-3 py-2"
                        >
                          <dt className="font-mono text-xs font-semibold text-emerald-700">
                            {symbol.symbol || "—"}
                          </dt>
                          <dd className="text-xs leading-5 text-zinc-600">
                            {symbol.meaning}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote>{labels.emptyFormulas}</EmptyNote>
        )}
      </Section>

      <Section
        title={labels.examples}
        count={
          curriculum.examples.length > 0
            ? curriculum.examples.length
            : undefined
        }
      >
        {curriculum.examples.length > 0 ? (
          <ol className="space-y-3">
            {curriculum.examples.map((example, index) => (
              <li
                key={`${index}-${example.title}`}
                className="rounded-xl border border-zinc-200 bg-white p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-900">
                      {example.title || `${labels.example} ${index + 1}`}
                    </p>

                    {example.problem ? (
                      <div className="mt-3">
                        <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                          {labels.problem}
                        </p>
                        <p className="mt-1 text-sm leading-7 whitespace-pre-line text-zinc-700">
                          {example.problem}
                        </p>
                      </div>
                    ) : null}

                    {example.solution ? (
                      <div className="mt-3 rounded-lg border-l-4 border-emerald-400 bg-emerald-50/70 px-4 py-3">
                        <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">
                          {labels.solution}
                        </p>
                        <p className="mt-1 text-sm leading-7 whitespace-pre-line text-zinc-700">
                          {example.solution}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyNote>{labels.emptyExamples}</EmptyNote>
        )}
      </Section>

      {showQuestions ? (
        <Section
          title={labels.questions}
          count={
            curriculum.questions.length > 0
              ? curriculum.questions.length
              : undefined
          }
        >
          {curriculum.questions.length > 0 ? (
            <ol className="space-y-4">
              {curriculum.questions.map((question, index) => (
                <li
                  key={`${question.id}-${index}`}
                  className="rounded-xl border border-zinc-200 bg-white p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                        questionTypeStyles[question.type]
                      }`}
                    >
                      {labels.questionTypes[question.type]}
                    </span>
                    {question.difficulty ? (
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                        {question.difficulty}
                      </span>
                    ) : null}
                  </div>

                  {question.question ? (
                    <p className="mt-3 text-sm leading-6 font-semibold whitespace-pre-line text-zinc-900">
                      {question.question}
                    </p>
                  ) : null}

                  <QuestionBody question={question} labels={labels} />

                  <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                    <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">
                      {labels.answer}
                    </p>
                    <div className="mt-1">
                      <AnswerContent question={question} labels={labels} />
                    </div>
                  </div>

                  {question.explanation ? (
                    <div className="mt-2 rounded-lg bg-zinc-50 px-4 py-3">
                      <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                        {labels.explanation}
                      </p>
                      <p className="mt-1 text-sm leading-6 whitespace-pre-line text-zinc-700">
                        {question.explanation}
                      </p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <EmptyNote>{labels.emptyQuestions}</EmptyNote>
          )}
        </Section>
      ) : null}
    </>
  );
}



