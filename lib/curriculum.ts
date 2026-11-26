/**
 * Optional fields are read defensively: the AI service returns JSON in the
 * `teaching` / `questions` shape described in its SYSTEM_PROMPT, but a model can
 * still omit a key or answer with an unexpected type. Parsing here keeps the UI
 * components free of `unknown` handling.
 */

export type CurriculumQuestionType =
  | "multiple_choice"
  | "multiple_response"
  | "calculation"
  | "fill_in_the_blank"
  | "true_false"
  | "table";

export type KeyConcept = {
  name: string;
  explanation: string;
};

export type FormulaSymbol = {
  symbol: string;
  meaning: string;
};

export type Formula = {
  formula: string;
  description: string;
  symbols: FormulaSymbol[];
};

export type WorkedExample = {
  title: string;
  problem: string;
  solution: string;
};

export type QuestionOption = {
  /** Option letter (A, B, C, …) or the array index as a fallback. */
  key: string;
  label: string;
};

export type TableAnswer = {
  /** 0-based row index inside `tableRows`. */
  row: number;
  /** 0-based column index inside `tableHeaders`. */
  column: number;
  value: string;
};

export type CurriculumQuestion = {
  id: string;
  type: CurriculumQuestionType;
  question: string;
  options: QuestionOption[];
  /** Answer for `multiple_choice` (a letter) and `calculation` (the result). */
  answerText: string;
  /** Answers for `fill_in_the_blank`, in the order of the blanks. */
  answerList: string[];
  /** Cell answers for `table`. */
  tableAnswers: TableAnswer[];
  explanation: string;
  difficulty: string;
  /** `calculation`: the given values. */
  given: string[];
  /** `calculation`: the formula to apply. */
  formula: string;
  tableHeaders: string[];
  tableRows: string[][];
};

export type ParsedCurriculum = {
  title: string;
  summary: string;
  keyConcepts: KeyConcept[];
  formulas: Formula[];
  examples: WorkedExample[];
  questions: CurriculumQuestion[];
};

/**
 * UI captions shared by every place that renders a curriculum (upload preview
 * and subject page). They live in the dictionary, not in the stored JSON.
 */
export type CurriculumLabels = {
  summary: string;
  concepts: string;
  formulas: string;
  examples: string;
  questions: string;
  symbols: string;
  problem: string;
  solution: string;
  given: string;
  formula: string;
  answer: string;
  explanation: string;
  example: string;
  row: string;
  trueLabel: string;
  falseLabel: string;
  emptySummary: string;
  emptyConcepts: string;
  emptyFormulas: string;
  emptyExamples: string;
  emptyQuestions: string;
  questionTypes: Record<CurriculumQuestionType, string>;
};

const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  // `true_false` questions may answer with a real JSON boolean.
  if (typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function readTextList(value: unknown): string[] {
  if (typeof value === "string") {
    const text = value.trim();
    return text ? [text] : [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(readText).filter((item) => item !== "");
}

function readKeyConcepts(value: unknown): KeyConcept[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item === "string") {
      const name = item.trim();
      return name ? [{ name, explanation: "" }] : [];
    }

    if (!isRecord(item)) {
      return [];
    }

    const name =
      readText(item.name) || readText(item.concept) || readText(item.title);
    const explanation =
      readText(item.explanation) || readText(item.description);

    return name || explanation
      ? [{ name: name || explanation, explanation }]
      : [];
  });
}

function readFormulaSymbols(value: unknown): FormulaSymbol[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item === "string") {
      const text = item.trim();

      if (!text) {
        return [];
      }

      // Models often write a single "c: Hypotenuse" string per symbol.
      const separator = text.indexOf(":");

      return separator > 0
        ? [
            {
              symbol: text.slice(0, separator).trim(),
              meaning: text.slice(separator + 1).trim(),
            },
          ]
        : [{ symbol: text, meaning: "" }];
    }

    if (!isRecord(item)) {
      return [];
    }

    const symbol = readText(item.symbol) || readText(item.name);
    const meaning = readText(item.meaning) || readText(item.description);

    return symbol || meaning ? [{ symbol, meaning }] : [];
  });
}

function readFormulas(value: unknown): Formula[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item === "string") {
      const formula = item.trim();
      return formula ? [{ formula, description: "", symbols: [] }] : [];
    }

    if (!isRecord(item)) {
      return [];
    }

    const formula = readText(item.formula) || readText(item.expression);
    const description =
      readText(item.description) || readText(item.explanation);
    const symbols = readFormulaSymbols(item.symbols);

    return formula || description || symbols.length > 0
      ? [{ formula, description, symbols }]
      : [];
  });
}

function readExamples(value: unknown): WorkedExample[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const title = readText(item.title) || readText(item.name);
    const problem = readText(item.problem) || readText(item.question);
    const solution =
      readText(item.solution) ||
      readText(item.answer) ||
      readText(item.explanation);

    return title || problem || solution
      ? [{ title, problem, solution }]
      : [];
  });
}

function readOptions(value: unknown): QuestionOption[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      // Normalised questions (e.g. an exam read back from the database) store
      // `{ key, label }`, while the AI may also send plain labels.
      if (isRecord(item)) {
        const label = readText(item.label) || readText(item.text);
        const key = readText(item.key) || OPTION_KEYS[index] || String(index + 1);

        return label ? [{ key: key.toUpperCase(), label }] : [];
      }

      const label = readText(item);
      return label
        ? [{ key: OPTION_KEYS[index] ?? String(index + 1), label }]
        : [];
    });
  }

  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, item]) => {
    const label = readText(item);
    return label ? [{ key: key.trim().toUpperCase() || key, label }] : [];
  });
}

function readTable(value: unknown): { headers: string[]; rows: string[][] } {
  if (!isRecord(value)) {
    return { headers: [], rows: [] };
  }

  const headers = readTextList(value.headers);
  const rows = Array.isArray(value.rows)
    ? value.rows.map((row) => (Array.isArray(row) ? row.map(readText) : []))
    : [];

  return { headers, rows };
}

function readTableAnswers(value: unknown): TableAnswer[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const row = Number(item.row);
    const column = Number(item.column);

    if (!Number.isInteger(row) || !Number.isInteger(column)) {
      return [];
    }

    return [
      {
        row,
        column,
        value: readText(item.value) || readText(item.answer),
      },
    ];
  });
}

function readQuestionType(
  value: unknown,
  fallback: CurriculumQuestionType,
): CurriculumQuestionType {
  const type = readText(value).toLowerCase().replace(/[\s-]+/g, "_");

  switch (type) {
    case "multiple_choice":
    case "multiplechoice":
    case "mcq":
    case "trac_nghiem":
    case "einzelwahl":
      return "multiple_choice";
    case "multiple_response":
    case "multiple_responses":
    case "multiple_answers":
    case "multiple_select":
    case "multi_select":
    case "multi_choice":
    case "nhieu_dap_an":
    case "trac_nghiem_nhieu_dap_an":
    case "mehrfachauswahl":
      return "multiple_response";
    case "calculation":
    case "calculate":
    case "tinh_toan":
    case "rechnen":
      return "calculation";
    case "fill_in_the_blank":
    case "fill_in_blank":
    case "fill_in_the_blanks":
    case "dien_khuyet":
    case "stichwort":
    case "lueckentext":
      return "fill_in_the_blank";
    case "true_false":
    case "truefalse":
    case "true_or_false":
    case "boolean":
    case "dung_sai":
    case "richtig_falsch":
    case "ja_nein":
      return "true_false";
    case "table":
    case "ke_bang":
    case "tabelle":
      return "table";
    default:
      return fallback;
  }
}

function readQuestions(value: unknown): CurriculumQuestion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item, index) => {
    if (!isRecord(item)) {
      return [];
    }

    const question = readText(item.question) || readText(item.prompt);
    const options = readOptions(item.options);
    const table = readTable(item.table_data);

    // Accept both contracts: the raw AI payload (`answer`) and an already
    // normalised question (`answerText` / `answerList` / `tableAnswers`) as
    // stored inside a generated exam.
    const rawAnswer = item.answer ?? item.answerList ?? item.answerText;
    const answerText = readText(item.answer) || readText(item.answerText);
    const answerList = Array.isArray(item.answer)
      ? readTextList(item.answer)
      : readTextList(item.answerList);
    const tableAnswers = Array.isArray(item.answer)
      ? readTableAnswers(item.answer)
      : readTableAnswers(item.tableAnswers);

    // A missing `type` is derived from the payload itself.
    const fallbackType: CurriculumQuestionType =
      table.rows.length > 0
        ? "table"
        : options.length > 0
          ? "multiple_choice"
          : typeof rawAnswer === "boolean"
            ? "true_false"
            : Array.isArray(rawAnswer)
              ? "fill_in_the_blank"
              : "calculation";

    const hasContent =
      Boolean(question) ||
      options.length > 0 ||
      table.rows.length > 0 ||
      answerText.length > 0 ||
      answerList.length > 0 ||
      tableAnswers.length > 0;

    if (!hasContent) {
      return [];
    }

    return [
      {
        id: readText(item.id) || String(index + 1),
        type: readQuestionType(item.type, fallbackType),
        question,
        options,
        answerText,
        answerList,
        tableAnswers,
        explanation: readText(item.explanation),
        difficulty: readText(item.difficulty),
        given: readTextList(item.given),
        formula: readText(item.formula),
        tableHeaders: table.headers,
        tableRows: table.rows,
      },
    ];
  });
}

/**
 * Normalises the `questions` array of the AI contract (also used for generated
 * practice papers from `/generate-exam`, which return questions only).
 */
export function parseQuestions(value: unknown): CurriculumQuestion[] {
  return readQuestions(value);
}

/**
 * Normalises the `data` object returned by POST /process-document.
 * Falls back to a top-level `summary` for documents stored before the
 * `teaching` wrapper existed.
 */
export function parseCurriculum(value: unknown): ParsedCurriculum {
  const record: Record<string, unknown> = isRecord(value) ? value : {};
  const teaching: Record<string, unknown> = isRecord(record.teaching)
    ? record.teaching
    : {};

  return {
    title: readText(record.title),
    summary: readText(teaching.summary) || readText(record.summary),
    keyConcepts: readKeyConcepts(teaching.key_concepts),
    formulas: readFormulas(teaching.formulas),
    examples: readExamples(teaching.examples),
    questions: readQuestions(record.questions),
  };
}
