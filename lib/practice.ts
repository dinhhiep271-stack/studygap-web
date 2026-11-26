import type { CurriculumQuestion } from "./curriculum";

/**
 * Practice formats offered by the subject workspace. They are derived from the
 * question payload instead of being stored separately:
 *
 * - `single_choice` / `multiple_response` → `multiple_choice` questions with one
 *   or several correct option keys,
 * - `calculation` → `calculation`,
 * - `fill_in_the_blank` → `fill_in_the_blank` (Stichwort),
 * - `true_false` → `true_false`,
 * - `table` → `table` (Lückentabelle).
 */
export const practiceFormats = [
  "single_choice",
  "multiple_response",
  "calculation",
  "fill_in_the_blank",
  "true_false",
  "table",
] as const;

export type PracticeFormat = (typeof practiceFormats)[number];

/** Narrow an arbitrary query-string value to a known practice format. */
export function isPracticeFormat(value: unknown): value is PracticeFormat {
  return (
    typeof value === "string" &&
    (practiceFormats as readonly string[]).includes(value)
  );
}

export const emptyPracticeCount: Record<PracticeFormat, number> = {
  single_choice: 0,
  multiple_response: 0,
  calculation: 0,
  fill_in_the_blank: 0,
  true_false: 0,
  table: 0,
};

/** Lower-cases, removes trailing punctuation and folds diacritics (ü → u, đ → d). */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?]+$/, "");
}

/**
 * Parses a number written in German or Vietnamese notation:
 * "1.200.000", "1,200,000", "3,5", "3.5", "1.200,50 €" → 1200000 / 3.5 / 1200.5.
 */
export function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[\s\u00a0]/g, "").replace(/[^\d.,+-]/g, "");

  if (!/\d/.test(cleaned)) {
    return null;
  }

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;

  if (lastComma !== -1 && lastDot !== -1) {
    normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, "").replace(/,/g, ".")
        : cleaned.replace(/,/g, "");
  } else if (lastComma !== -1) {
    normalized = /^-?\d{1,3}(,\d{3})+$/.test(cleaned)
      ? cleaned.replace(/,/g, "")
      : cleaned.replace(/,/g, ".");
  } else if (lastDot !== -1) {
    normalized = /^-?\d{1,3}(\.\d{3})+$/.test(cleaned)
      ? cleaned.replace(/\./g, "")
      : cleaned;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function numbersMatch(actual: number, expected: number) {
  // Absolute tolerance for rounded results (2 decimals) plus a tiny relative
  // part for floating point noise, but never loose enough to accept 1.200.001
  // when 1.200.000 is expected.
  const tolerance = Math.max(0.01, Math.abs(expected) * 1e-9);

  return Math.abs(actual - expected) <= tolerance;
}

/** Compares a learner answer with the stored answer (numbers or text). */
export function answersMatch(expected: string, actual: string) {
  const normalizedActual = normalizeText(actual);

  if (!normalizedActual) {
    return false;
  }

  // Several accepted spellings can be separated with "|" or ";".
  const candidates = expected
    .split(/[|;]/)
    .map(normalizeText)
    .filter(Boolean);

  if (candidates.includes(normalizedActual)) {
    return true;
  }

  const expectedNumber = parseNumber(expected);
  const actualNumber = parseNumber(actual);

  return expectedNumber !== null && actualNumber !== null
    ? numbersMatch(actualNumber, expectedNumber)
    : false;
}


function optionLetterKeys(question: CurriculumQuestion) {
  const keys = new Set(
    question.options.map((option) => option.key.trim().toUpperCase()),
  );

  return keys.size > 0 ? keys : null;
}

function pushChoiceKeys(
  question: CurriculumQuestion,
  raw: string,
  target: string[],
) {
  const optionKeys = optionLetterKeys(question);
  const tokens = raw
    .replace(/[()[\]{}"']/g, " ")
    .split(/[,;/&]|\s+(?:und|và|va|and)\s+/i)
    .map((token) => token.trim())
    .filter(Boolean);

  for (const token of tokens) {
    // "AC" → A, C.
    if (/^[A-Fa-f]{2,6}$/.test(token)) {
      for (const letter of token.toUpperCase().split("")) {
        if (!optionKeys || optionKeys.has(letter)) {
          target.push(letter);
        }
      }
      continue;
    }

    const byLabel = question.options.find(
      (option) => normalizeText(option.label) === normalizeText(token),
    );

    if (byLabel) {
      target.push(byLabel.key.trim().toUpperCase());
      continue;
    }

    const letter = token.match(/^([A-Za-z])(?:[).:\-]|\s|$)/);

    if (letter) {
      const key = letter[1].toUpperCase();

      if (!optionKeys || optionKeys.has(key)) {
        target.push(key);
      }
    }
  }
}

/** Option keys marked as correct ("A", "A, C", ["A", "C"], "AC", …). */
export function correctChoiceKeys(question: CurriculumQuestion): string[] {
  const keys: string[] = [];

  question.answerList.forEach((answer) =>
    pushChoiceKeys(question, answer, keys),
  );

  if (keys.length === 0 && question.answerText) {
    pushChoiceKeys(question, question.answerText, keys);
  }

  return [...new Set(keys)];
}

const TRUE_ANSWERS = new Set([
  "true",
  "wahr",
  "richtig",
  "ja",
  "yes",
  "dung",
  "đúng",
  "t",
  "1",
]);

const FALSE_ANSWERS = new Set([
  "false",
  "falsch",
  "unwahr",
  "nein",
  "no",
  "sai",
  "f",
  "0",
]);

/** Correct value of a `true_false` question, `null` when it cannot be read. */
export function correctTruth(question: CurriculumQuestion): boolean | null {
  const candidates = [question.answerText, ...question.answerList]
    .map((value) => normalizeText(value))
    .filter(Boolean);

  for (const candidate of candidates) {
    if (TRUE_ANSWERS.has(candidate)) {
      return true;
    }

    if (FALSE_ANSWERS.has(candidate)) {
      return false;
    }
  }

  return null;
}

/** Which practice tab a stored question belongs to. */
export function practiceFormatOf(question: CurriculumQuestion): PracticeFormat {
  switch (question.type) {
    case "multiple_response":
      return "multiple_response";
    case "calculation":
      return "calculation";
    case "fill_in_the_blank":
      return "fill_in_the_blank";
    case "true_false":
      return "true_false";
    case "table":
      return "table";
    default:
      return correctChoiceKeys(question).length > 1
        ? "multiple_response"
        : "single_choice";
  }
}

/** A question is only listed when it can actually be answered and graded. */
export function isPracticeReady(question: CurriculumQuestion): boolean {
  switch (practiceFormatOf(question)) {
    case "single_choice":
    case "multiple_response":
      return (
        question.options.length > 0 && correctChoiceKeys(question).length > 0
      );
    case "calculation":
      return question.answerText.trim() !== "";
    case "fill_in_the_blank":
      return (
        question.answerList.length > 0 ||
        (question.answerText !== "" && /_{2,}/.test(question.question))
      );
    case "true_false":
      return correctTruth(question) !== null;
    case "table":
      return question.tableAnswers.length > 0 && question.tableRows.length > 0;
  }
}

export function questionsForFormat(
  questions: CurriculumQuestion[],
  format: PracticeFormat,
): CurriculumQuestion[] {
  return questions.filter(
    (question) =>
      practiceFormatOf(question) === format && isPracticeReady(question),
  );
}

export function countQuestionsByFormat(
  questions: CurriculumQuestion[],
): Record<PracticeFormat, number> {
  const counts = { ...emptyPracticeCount };

  for (const question of questions) {
    if (isPracticeReady(question)) {
      counts[practiceFormatOf(question)] += 1;
    }
  }

  return counts;
}

export function isChoiceAnswerCorrect(
  question: CurriculumQuestion,
  selected: string[],
): boolean {
  const expected = correctChoiceKeys(question);
  const chosen = new Set(selected.map((key) => key.toUpperCase()));

  return (
    expected.length > 0 &&
    chosen.size === expected.length &&
    expected.every((key) => chosen.has(key))
  );
}

export function isCalculationAnswerCorrect(
  question: CurriculumQuestion,
  input: string,
): boolean {
  if (question.answerText.trim() === "" || input.trim() === "") {
    return false;
  }

  const expected = parseNumber(question.answerText);
  const actual = parseNumber(input);

  if (expected !== null && actual !== null) {
    return numbersMatch(actual, expected);
  }

  return normalizeText(input) === normalizeText(question.answerText);
}

/** Number of `___` markers in a fill-in-the-blank question (min. 1). */
export function blankCount(question: CurriculumQuestion): number {
  const markers = question.question.split(/_{2,}/).length - 1;

  return Math.max(markers, question.answerList.length, 1);
}

export function isFillInAnswerCorrect(
  question: CurriculumQuestion,
  values: string[],
): boolean {
  const expected = question.answerList.length
    ? question.answerList
    : [question.answerText];

  if (expected.length === 0 || values.length < expected.length) {
    return false;
  }

  return expected.every((answer, index) =>
    answersMatch(answer, values[index] ?? ""),
  );
}

export function isTrueFalseAnswerCorrect(
  question: CurriculumQuestion,
  value: boolean | null,
): boolean {
  const expected = correctTruth(question);

  return expected !== null && value !== null && expected === value;
}

export function tableCellKey(row: number, column: number) {
  return `${row}-${column}`;
}

export function isTableAnswerCorrect(
  question: CurriculumQuestion,
  values: Record<string, string>,
): boolean {
  if (question.tableAnswers.length === 0) {
    return false;
  }

  return question.tableAnswers.every((answer) =>
    answersMatch(
      answer.value,
      values[tableCellKey(answer.row, answer.column)] ?? "",
    ),
  );
}

export function correctAnswerLabel(
  question: CurriculumQuestion,
  truthLabels: { trueLabel: string; falseLabel: string },
): string {
  switch (practiceFormatOf(question)) {
    case "single_choice":
    case "multiple_response": {
      const keys = correctChoiceKeys(question);
      const labels = keys.map(
        (key) =>
          question.options.find(
            (option) => option.key.trim().toUpperCase() === key,
          )?.label ?? key,
      );

      return labels.length > 0 ? labels.join(" · ") : "—";
    }
    case "calculation":
      return question.answerText || "—";
    case "fill_in_the_blank":
      return question.answerList.length > 0
        ? question.answerList.join(" · ")
        : question.answerText || "—";
    case "true_false": {
      const expected = correctTruth(question);

      return expected === null
        ? "—"
        : expected
          ? truthLabels.trueLabel
          : truthLabels.falseLabel;
    }
    case "table":
      return question.tableAnswers.length > 0
        ? question.tableAnswers.map((answer) => answer.value).join(" · ")
        : "—";
  }
}

/**
 * One learner answer to a question, independent of its format. Keeping all
 * fields in one object lets the practice center and the exam runner share the
 * same input component and grading helper.
 */
export type QuestionAnswer = {
  /** Selected option keys (`multiple_choice`, `multiple_response`). */
  keys: string[];
  /** Value of the `calculation` input. */
  text: string;
  /** Values of the `fill_in_the_blank` inputs, in blank order. */
  blanks: string[];
  /** `true_false` choice; `null` until the learner picks one. */
  truth: boolean | null;
  /** `table` cell values, keyed with `tableCellKey(row, column)`. */
  table: Record<string, string>;
};

export function createQuestionAnswer(
  question: CurriculumQuestion,
): QuestionAnswer {
  return {
    keys: [],
    text: "",
    blanks: Array.from({ length: blankCount(question) }, () => ""),
    truth: null,
    table: {},
  };
}

/** True when every input the format needs has been filled in. */
export function isAnswerComplete(
  question: CurriculumQuestion,
  answer: QuestionAnswer,
): boolean {
  switch (practiceFormatOf(question)) {
    case "single_choice":
    case "multiple_response":
      return answer.keys.length > 0;
    case "calculation":
      return answer.text.trim() !== "";
    case "fill_in_the_blank": {
      const blanks = Array.from(
        { length: blankCount(question) },
        (_, index) => answer.blanks[index] ?? "",
      );

      return blanks.every((value) => value.trim() !== "");
    }
    case "true_false":
      return answer.truth !== null;
    case "table":
      return (
        question.tableAnswers.length > 0 &&
        question.tableAnswers.every(
          (cell) =>
            (answer.table[tableCellKey(cell.row, cell.column)] ?? "").trim() !==
            "",
        )
      );
  }
}

/** Grades one answer with the same rules as the format-specific screens. */
export function gradeQuestion(
  question: CurriculumQuestion,
  answer: QuestionAnswer,
): boolean {
  switch (practiceFormatOf(question)) {
    case "single_choice":
    case "multiple_response":
      return isChoiceAnswerCorrect(question, answer.keys);
    case "calculation":
      return isCalculationAnswerCorrect(question, answer.text);
    case "fill_in_the_blank":
      return isFillInAnswerCorrect(question, answer.blanks);
    case "true_false":
      return isTrueFalseAnswerCorrect(question, answer.truth);
    case "table":
      return isTableAnswerCorrect(question, answer.table);
  }
}
