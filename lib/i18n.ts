import type { ConceptLabels } from "@/lib/concept";
import type { CurriculumLabels } from "@/lib/curriculum";
import type { Locale } from "@/lib/locales";
import type { PracticeFormat } from "@/lib/practice";

export type Dictionary = {
  meta: {
    defaultTitle: string;
    template: string;
    description: string;
  };
  nav: {
    mainLabel: string;
    subjects: string;
    upload: string;
    language: string;
    toGerman: string;
    toVietnamese: string;
    logout: string;
    loggingOut: string;
  };
  home: {
    term: string;
    title: string;
    intro: string;
    addSubject: string;
    listLabel: string;
    enter: string;
    subjectsUnit: string;
  };
  subject: {
    breadcrumbLabel: string;
    home: string;
    documentsUnit: string;
    uploadMore: string;
    allSubjects: string;
    documentsTitle: string;
    documentsHint: string;
    documentsEmpty: string;
    uploadedAt: string;
    languageLabel: string;
    pagesUnit: string;
    languageFallback: string;
    truncatedNote: string;
    notFoundTitle: string;
    /** Learning path (Kapitel sidebar + progress). */
    learningPath: string;
    learningHint: string;
    chapterListLabel: string;
    chapterUnit: string;
    progressLabel: string;
    markDone: string;
    markUndone: string;
    resetProgress: string;
    contentTab: string;
    practiceTab: string;
  };
  /** Captions for the AI curriculum sections (teaching + questions). */
  curriculum: CurriculumLabels;
  /** AI concept explainer (`POST /explain-concept`) dialog and cards. */
  concept: ConceptLabels;
  /** Practice center: one tab per exercise format. */
  practice: {
    title: string;
    intro: string;
    chooseFormat: string;
    questionsUnit: string;
    questionUnit: string;
    emptyFormat: string;
    check: string;
    retry: string;
    correct: string;
    incorrect: string;
    correctAnswer: string;
    explanation: string;
    selectHint: string;
    inputPlaceholder: string;
    keywordPlaceholder: string;
    given: string;
    formula: string;
    row: string;
    trueLabel: string;
    falseLabel: string;
    tableHint: string;
    scoreLabel: string;
    formats: Record<PracticeFormat, string>;
    hints: Record<PracticeFormat, string>;
  };
  /** AI-generated practice papers and the final exam (timer + grading). */
  exam: {
    /** "Tạo đề mới" card inside the chapter practice center. */
    generatorTitle: string;
    generatorIntro: string;
    countLabel: string;
    countHint: string;
    generate: string;
    generating: string;
    generateHint: string;
    /** Final exam setup panel. */
    finalTitle: string;
    finalIntro: string;
    finalScope: string;
    finalChapters: string;
    finalCountLabel: string;
    finalDurationLabel: string;
    finalDurationHint: string;
    finalStart: string;
    finalStarting: string;
    finalHint: string;
    finalNoChapters: string;
    /** Sidebar entry under the chapter list. */
    finalNavLabel: string;
    finalNavHint: string;
    /** Exam runner. */
    runnerEyebrowChapter: string;
    runnerEyebrowFinal: string;
    timeLeft: string;
    timeUp: string;
    autoSubmitted: string;
    answered: string;
    submit: string;
    submitting: string;
    exit: string;
    backToPractice: string;
    newExam: string;
    retry: string;
    /** Result card. */
    resultTitle: string;
    resultPassed: string;
    resultFailed: string;
    correctCount: string;
    incorrectCount: string;
    unansweredCount: string;
    percentLabel: string;
    gradeLabel: string;
    gradeScaleHint: string;
    reviewTitle: string;
    /** Mapped from the API error codes (`no-material`, `network`, …). */
    errors: {
      network: string;
      timeout: string;
      upstream: string;
      invalid: string;
      empty: string;
      "no-material": string;
      "unknown-chapter": string;
      "unknown-subject": string;
      "invalid-body": string;
      "invalid-json": string;
      unknown: string;
    };
  };
  /** Formular zum Anlegen eines Fachs (`/[lang]/subject/new`). */
  newSubject: {
    metaTitle: string;
    back: string;
    eyebrow: string;
    title: string;
    intro: string;
    nameDeLabel: string;
    nameDeHint: string;
    nameDePlaceholder: string;
    nameViLabel: string;
    nameViHint: string;
    nameViPlaceholder: string;
    descriptionLabel: string;
    descriptionHint: string;
    descriptionPlaceholder: string;
    optional: string;
    submit: string;
    submitting: string;
    cancel: string;
    errors: {
      nameDe: string;
      nameVi: string;
      tooLong: string;
      network: string;
      save: string;
    };
  };
  upload: {
    metaTitle: string;
    back: string;
    eyebrow: string;
    title: string;
    intro: string;
    subjectLabel: string;
    subjectHint: string;
    dropTitle: string;
    dropSubtitle: string;
    chooseFile: string;
    hint: string;
    remove: string;
    selectedFilesLabel: string;
    clearAll: string;
    errors: {
      unsupported: string;
      tooLarge: string;
      tooMany: string;
      noFile: string;
      network: string;
      unexpected: string;
      save: string;
    };
    processingHint: string;
    processingTitle: string;
    waitingForAi: string;
    queueWaiting: string;
    fileProgressLabel: string;
    saving: string;
    redirecting: string;
    resultHeading: string;
    resultUntitled: string;
    resultPagesLabel: string;
    resultFilesUnit: string;
    resultSuccessBadge: string;
    resultFailedBadge: string;
    resultFailedHint: string;
    resultTruncatedNote: string;
    chapterSavedBadge: string;
    chapterListHeading: string;
    chapterListHint: string;
    openSubjectPage: string;
    cancel: string;
    submit: string;
    uploading: string;
  };
  /** Login page (`/[lang]/login`), rendered per locale. */
  login: {
    metaTitle: string;
    title: string;
    intro: string;
    google: string;
    googleRedirecting: string;
    usernameLabel: string;
    passwordLabel: string;
    submit: string;
    submitting: string;
    invalidCredentials: string;
    missingFields: string;
    networkError: string;
    sessionHint: string;
    language: string;
  };
  notFound: {
    title: string;
    description: string;
    home: string;
  };
  footer: string;
};

const de: Dictionary = {
  meta: {
    defaultTitle: "Studygap – Lernen mit System",
    template: "%s · Studygap",
    description:
      "Fächer, Lernmaterialien und Multiple-Choice-Übungen in einem persönlichen Lernbereich verwalten.",
  },
  nav: {
    mainLabel: "Hauptnavigation",
    subjects: "Fächer",
    upload: "Material hochladen",
    language: "Sprache wählen",
    toGerman: "Auf Deutsch wechseln",
    toVietnamese: "Auf Vietnamesisch wechseln",
    logout: "Abmelden",
    loggingOut: "Abmelden …",
  },
  home: {
    term: "Herbstsemester 2026",
    title: "Deine Fächer",
    intro:
      "Kurzlehrpläne, Lernmaterialien und Übungen für jedes Fach – alles an einem Ort.",
    addSubject: "Neues Fach hinzufügen",
    listLabel: "Fächerliste",
    enter: "Zum Fach",
    subjectsUnit: "Fächer",
  },
  subject: {
    breadcrumbLabel: "Brotkrumennavigation",
    home: "Fächer",
    documentsUnit: "Dokumente",
    uploadMore: "Weitere Materialien hochladen",
    allSubjects: "Alle Fächer",
    documentsTitle: "Materialien & Lerninhalte",
    documentsHint:
      "Alle Dokumente des Fachs mit Zusammenfassung, Formeln, Beispielen und Übungen – direkt aus der Datenbank.",
    documentsEmpty: "Für dieses Fach sind noch keine Materialien gespeichert.",
    uploadedAt: "Hochgeladen am",
    languageLabel: "Sprache",
    pagesUnit: "Seiten",
    languageFallback:
      "Weitere Materialien liegen nur in der anderen Sprache vor und werden hier nicht angezeigt. Lade ein Dokument in dieser Sprache hoch, um sie zu sehen.",
    truncatedNote:
      "Das Dokument war sehr lang: Die KI hat nur den ersten Teil ausgewertet.",
    notFoundTitle: "Fach nicht gefunden",
    learningPath: "Lernpfad",
    learningHint:
      "Lerne Kapitel für Kapitel, hake Erledigtes ab und übe gezielt im Übungscenter.",
    chapterListLabel: "Kapitelübersicht",
    chapterUnit: "Kapitel",
    progressLabel: "Lernfortschritt",
    markDone: "Als gelernt markieren",
    markUndone: "Markierung entfernen",
    resetProgress: "Zurücksetzen",
    contentTab: "Inhalt",
    practiceTab: "Übungscenter",
  },
  curriculum: {
    summary: "Zusammenfassung",
    concepts: "Wichtige Begriffe",
    formulas: "Formeln",
    examples: "Beispiele",
    questions: "Übungen",
    symbols: "Symbole",
    problem: "Aufgabe",
    solution: "Lösung",
    given: "Gegeben",
    formula: "Formel",
    answer: "Antwort",
    explanation: "Erklärung",
    example: "Beispiel",
    row: "Zeile",
    trueLabel: "Richtig",
    falseLabel: "Falsch",
    emptySummary: "Für dieses Dokument wurde keine Zusammenfassung erstellt.",
    emptyConcepts:
      "Für dieses Dokument wurden keine wichtigen Begriffe erstellt.",
    emptyFormulas: "Dieses Dokument enthält keine Formeln.",
    emptyExamples: "Für dieses Dokument wurden keine Beispiele erstellt.",
    emptyQuestions: "Für dieses Dokument wurden keine Übungen erstellt.",
    questionTypes: {
      multiple_choice: "Multiple Choice",
      multiple_response: "Multiple Response",
      calculation: "Rechnen",
      fill_in_the_blank: "Lückentext",
      true_false: "Richtig/Falsch",
      table: "Tabelle",
    },
  },
  concept: {
    action: "Begriff erklären",
    dialogEyebrow: "KI-Erklärung",
    bilingualHint:
      "Zweisprachige Antwort: Deutsch fett oben, vietnamesische Übersetzung kursiv darunter.",
    loading: "Der Begriff wird analysiert …",
    loadingHint:
      "Die KI liest den Begriff im Kontext dieses Kapitels und erstellt Definition, Erklärung, Zusammenhang und Kritik.",
    errorTitle: "Erklärung nicht verfügbar",
    errors: {
      network:
        "Der KI-Dienst ist nicht erreichbar. Prüfe deine Verbindung und versuche es noch einmal.",
      timeout:
        "Die Antwort hat zu lange gedauert. Versuche es gleich noch einmal.",
      upstream:
        "Der KI-Dienst konnte die Erklärung gerade nicht erstellen. Bitte versuche es später noch einmal.",
      empty:
        "Die KI hat keine verwertbare Erklärung geliefert. Versuche es noch einmal.",
      "missing-concept":
        "Der Begriff fehlt in der Anfrage. Lade die Seite neu und versuche es erneut.",
      "invalid-body":
        "Die Anfrage war unvollständig. Lade die Seite neu und versuche es erneut.",
      "invalid-json":
        "Die Anfrage war unvollständig. Lade die Seite neu und versuche es erneut.",
      unauthorized: "Deine Sitzung ist abgelaufen. Melde dich neu an.",
      unknown: "Etwas ist schiefgelaufen. Bitte versuche es noch einmal.",
    },
    retry: "Noch einmal versuchen",
    close: "Schließen",
    emptySection: "Zu diesem Abschnitt liegt keine Antwort vor.",
    disclaimer:
      "KI-generierte Erklärung – kann Fehler enthalten. Prüfe sie anhand deines Materials.",
    sections: {
      definition: "Definition",
      erklaerung: "Erklärung",
      zusammenhang: "Zusammenhang",
      kritik: "Kritik",
    },
  },
  practice: {
    title: "Übungscenter",
    intro:
      "Wähle eine Aufgabenform, beantworte die Aufgaben und prüfe deine Lösung mit Erklärung.",
    chooseFormat: "Aufgabenform wählen",
    questionsUnit: "Aufgaben",
    questionUnit: "Aufgabe",
    emptyFormat:
      "Für diese Aufgabenform enthält das Kapitel noch keine Aufgaben. Lade weiteres Material hoch oder wähle eine andere Form.",
    check: "Prüfen",
    retry: "Noch einmal",
    correct: "Richtig!",
    incorrect: "Noch nicht richtig.",
    correctAnswer: "Lösung",
    explanation: "Erklärung",
    selectHint: "Wähle die passende Antwort.",
    inputPlaceholder: "Ergebnis eingeben",
    keywordPlaceholder: "Stichwort",
    given: "Gegeben",
    formula: "Formel",
    row: "Zeile",
    trueLabel: "Richtig",
    falseLabel: "Falsch",
    tableHint: "Fülle die leeren Zellen aus.",
    scoreLabel: "Ergebnis",
    formats: {
      single_choice: "Eine Antwort",
      multiple_response: "Mehrere Antworten",
      calculation: "Rechnen",
      fill_in_the_blank: "Lückentext / Stichwort",
      true_false: "Richtig oder falsch",
      table: "Tabelle ausfüllen",
    },
    hints: {
      single_choice: "Genau eine Option ist richtig.",
      multiple_response: "Mehrere Optionen können richtig sein.",
      calculation: "Trage das berechnete Ergebnis ein.",
      fill_in_the_blank: "Ergänze die Lücken mit dem Fachbegriff.",
      true_false: "Bewerte die Aussage als richtig oder falsch.",
      table: "Ergänze die fehlenden Werte in der Tabelle.",
    },
  },
  exam: {
    generatorTitle: "Neues Übungsblatt erstellen",
    generatorIntro:
      "Die KI schreibt neue Aufgaben aus dem Stoff dieses Kapitels – jedes Blatt ist anders.",
    countLabel: "Anzahl der Aufgaben",
    countHint: "1 bis 20 Aufgaben, Standard 10.",
    generate: "Neues Blatt erstellen",
    generating: "Die KI erstellt Aufgaben …",
    generateHint: "Das dauert in der Regel 30–90 Sekunden.",
    finalTitle: "Abschlussprüfung",
    finalIntro:
      "Eine Prüfung aus allen Kapiteln dieses Fachs – mit Timer, automatischer Abgabe und Note.",
    finalScope: "Alle Kapitel",
    finalChapters: "Kapitel im Prüfungsstoff",
    finalCountLabel: "Anzahl der Aufgaben",
    finalDurationLabel: "Bearbeitungszeit",
    finalDurationHint: "Nach Ablauf der Zeit wird die Prüfung automatisch abgegeben.",
    finalStart: "Prüfung starten",
    finalStarting: "Prüfung wird erstellt …",
    finalHint:
      "Die KI kombiniert den Stoff aller Kapitel. Das dauert 30–90 Sekunden.",
    finalNoChapters:
      "Für eine Abschlussprüfung wird mindestens ein Kapitel benötigt.",
    finalNavLabel: "Abschlussprüfung",
    finalNavHint: "Prüfung über alle Kapitel, mit Timer",
    runnerEyebrowChapter: "Übungsblatt",
    runnerEyebrowFinal: "Abschlussprüfung",
    timeLeft: "Restzeit",
    timeUp: "Die Zeit ist abgelaufen – die Prüfung wurde automatisch abgegeben.",
    autoSubmitted: "Automatisch abgegeben",
    answered: "Beantwortet",
    submit: "Abgeben",
    submitting: "Wird abgegeben …",
    exit: "Verlassen",
    backToPractice: "Zurück zum Übungscenter",
    newExam: "Neue Prüfung",
    retry: "Noch einmal üben",
    resultTitle: "Ergebnis",
    resultPassed: "Bestanden",
    resultFailed: "Nicht bestanden",
    correctCount: "Richtig",
    incorrectCount: "Falsch",
    unansweredCount: "Unbeantwortet",
    percentLabel: "Punkte",
    gradeLabel: "Note",
    gradeScaleHint: "Note nach deutscher Skala (1,0–5,0); bestanden ab 50 %.",
    reviewTitle: "Auswertung",
    errors: {
      network:
        "Der KI-Dienst ist nicht erreichbar. Prüfe, ob die API unter https://studygap-ai.onrender.com läuft.",
      timeout: "Die KI hat zu lange gebraucht. Bitte versuche es erneut.",
      upstream: "Der KI-Dienst konnte das Blatt nicht erstellen. Bitte versuche es erneut.",
      invalid: "Die KI hat ein ungültiges Blatt geliefert. Bitte versuche es erneut.",
      empty: "Die KI hat keine verwendbaren Aufgaben geliefert. Bitte versuche es erneut.",
      "no-material":
        "Für dieses Fach ist noch kein Material gespeichert. Lade zuerst ein Dokument hoch.",
      "unknown-chapter": "Dieses Kapitel wurde nicht gefunden. Lade die Seite neu.",
      "unknown-subject": "Dieses Fach wurde nicht gefunden.",
      "invalid-body": "Ungültige Anfrage.",
      "invalid-json": "Ungültige Anfrage.",
      unknown: "Das Blatt konnte nicht erstellt werden. Bitte versuche es erneut.",
    },
  },
  newSubject: {
    metaTitle: "Neues Fach anlegen",
    back: "Zurück zur Fächerliste",
    eyebrow: "Neues Fach",
    title: "Fach hinzufügen",
    intro:
      "Lege das Fach mit deutschem und vietnamesischem Namen an. Danach lädst du direkt die ersten Materialien hoch.",
    nameDeLabel: "Name (Deutsch)",
    nameDeHint: "Steht als Haupttitel auf der Fachseite.",
    nameDePlaceholder: "z. B. Statistik I",
    nameViLabel: "Name (Vietnamesisch)",
    nameViHint: "Wird angezeigt, wenn die Sprache auf Vietnamesisch steht.",
    nameViPlaceholder: "z. B. Thống kê I",
    descriptionLabel: "Beschreibung",
    descriptionHint: "Ein bis zwei Sätze dazu, worum es in dem Fach geht.",
    descriptionPlaceholder:
      "z. B. Deskriptive Statistik, Wahrscheinlichkeiten und Hypothesentests.",
    optional: "optional",
    submit: "Fach anlegen",
    submitting: "Fach wird angelegt …",
    cancel: "Abbrechen",
    errors: {
      nameDe: "Bitte gib den deutschen Namen des Fachs ein.",
      nameVi: "Bitte gib den vietnamesischen Namen des Fachs ein.",
      tooLong:
        "Der Text ist zu lang: höchstens 120 Zeichen pro Name und 600 Zeichen für die Beschreibung.",
      network:
        "Der Server ist nicht erreichbar. Prüfe die Verbindung und versuche es erneut.",
      save: "Das Fach konnte nicht gespeichert werden. Bitte versuche es erneut.",
    },
  },
  upload: {
    metaTitle: "Material hochladen",
    back: "Zurück zur Fächerliste",
    eyebrow: "Kursmaterial",
    title: "Material hochladen",
    intro:
      "Wähle das Fach und lade ein oder mehrere Dokumente hoch, damit Studygap die Inhalte zusammenfasst und Übungen erstellt.",
    subjectLabel: "Fach",
    subjectHint:
      "Die Auswertung wird diesem Fach zugeordnet und erscheint danach auf dessen Seite.",
    dropTitle: "Dateien hierher ziehen",
    dropSubtitle: "oder wähle eine oder mehrere Dateien von deinem Computer",
    chooseFile: "Dateien auswählen",
    hint: "Unterstützt PDF, Word, Excel, Text – maximal 20 MB pro Datei, bis zu 10 Dateien",
    remove: "Entfernen",
    selectedFilesLabel: "Ausgewählte Dateien",
    clearAll: "Alle entfernen",
    errors: {
      unsupported:
        "Unterstützte Formate: PDF, Word (.docx), Excel (.xlsx), Text (.txt) und CSV (.csv).",
      tooLarge: "Die Datei darf höchstens 20 MB groß sein.",
      tooMany: "Es lassen sich höchstens 10 Dateien gleichzeitig verarbeiten.",
      noFile: "Bitte wähle zuerst mindestens eine Datei aus.",
      network:
        "Der Server ist nicht erreichbar. Prüfe, ob die API unter https://studygap-ai.onrender.com läuft.",
      unexpected:
        "Die Datei konnte nicht verarbeitet werden. Bitte versuche es erneut.",
      save: "Das Ergebnis konnte nicht in der Datenbank gespeichert werden. Bitte versuche es erneut.",
    },
    processingHint:
      "Die Dateien werden nacheinander ausgewertet; jede fertige Datei wird sofort als eigenes Kapitel gespeichert.",
    processingTitle: "Die KI verarbeitet deine Dokumente",
    waitingForAi: "Wartet auf die KI …",
    queueWaiting: "Wartet in der Warteschlange …",
    fileProgressLabel: "Datei",
    saving: "Ergebnis wird gespeichert …",
    redirecting: "Fachseite wird geöffnet …",
    resultHeading: "Auswertung der Dokumente",
    resultUntitled: "Ohne Titel",
    resultPagesLabel: "Seiten",
    resultFilesUnit: "Dateien",
    resultSuccessBadge: "Fertig",
    resultFailedBadge: "Fehler",
    resultFailedHint: "Diese Datei konnte nicht ausgewertet werden.",
    resultTruncatedNote:
      "Das Dokument ist sehr lang. Die KI hat nur den ersten Teil ausgewertet.",
    chapterSavedBadge: "Gespeichert",
    chapterListHeading: "Kapitel aus diesem Upload",
    chapterListHint: "Jede Datei wird als eigenes Kapitel gespeichert.",
    openSubjectPage: "Fachseite öffnen",
    cancel: "Abbrechen",
    submit: "Hochladen",
    uploading: "Dokumente werden verarbeitet …",
  },
  login: {
    metaTitle: "Anmelden",
    title: "Willkommen zurück",
    intro:
      "Dieser Bereich ist privat. Melde dich mit deinem Benutzernamen und Passwort an, um Studygap zu öffnen.",
    google: "Mit Google anmelden",
    googleRedirecting: "Weiterleitung zu Google …",
    usernameLabel: "Benutzername",
    passwordLabel: "Passwort",
    submit: "Anmelden",
    submitting: "Anmeldung läuft …",
    invalidCredentials: "Benutzername oder Passwort ist falsch.",
    missingFields: "Bitte gib Benutzername und Passwort ein.",
    networkError:
      "Die Anmeldung ist fehlgeschlagen. Prüfe die Verbindung und versuche es erneut.",
    sessionHint: "Die Anmeldung wird 30 Tage gespeichert.",
    language: "Sprache der Anmeldeseite",
  },
  notFound: {
    title: "Seite nicht gefunden",
    description:
      "Das Fach oder der Link existiert nicht. Kehre zur Startseite zurück und wähle ein anderes Fach.",
    home: "Zur Startseite",
  },
  footer: "Studygap – lieber gründlich als schnell.",
};

const vi: Dictionary = {
  meta: {
    defaultTitle: "Studygap – Học tập cá nhân",
    template: "%s · Studygap",
    description:
      "Quản lý môn học, tài liệu học và bài tập trắc nghiệm trong một không gian học tập cá nhân.",
  },
  nav: {
    mainLabel: "Điều hướng chính",
    subjects: "Môn học",
    upload: "Tải tài liệu",
    language: "Chọn ngôn ngữ",
    toGerman: "Chuyển sang tiếng Đức",
    toVietnamese: "Chuyển sang tiếng Việt",
    logout: "Đăng xuất",
    loggingOut: "Đang đăng xuất...",
  },
  home: {
    term: "Học kỳ Thu 2026",
    title: "Môn học của bạn",
    intro:
      "Tóm tắt giáo trình, tài liệu học và bài tập cho từng môn — tất cả ở một nơi.",
    addSubject: "Thêm môn học mới",
    listLabel: "Danh sách môn học",
    enter: "Vào học",
    subjectsUnit: "môn học",
  },
  subject: {
    breadcrumbLabel: "Điều hướng",
    home: "Môn học",
    documentsUnit: "tài liệu",
    uploadMore: "Tải thêm tài liệu",
    allSubjects: "Tất cả môn học",
    documentsTitle: "Tài liệu & nội dung học",
    documentsHint:
      "Toàn bộ tài liệu của môn học kèm tóm tắt, công thức, ví dụ và bài tập — lấy trực tiếp từ cơ sở dữ liệu.",
    documentsEmpty: "Môn học này chưa có tài liệu nào được lưu.",
    uploadedAt: "Tải lên lúc",
    languageLabel: "Ngôn ngữ",
    pagesUnit: "trang",
    languageFallback:
      "Một số tài liệu chỉ có ở ngôn ngữ còn lại nên không hiển thị tại đây. Hãy tải lên một tài liệu bằng ngôn ngữ này để xem nội dung.",
    truncatedNote:
      "Tài liệu quá dài nên AI chỉ phân tích phần đầu của tài liệu.",
    notFoundTitle: "Không tìm thấy môn học",
    learningPath: "Lộ trình học tập",
    learningHint:
      "Học theo từng chương, đánh dấu chương đã hoàn thành và luyện tập trọng tâm.",
    chapterListLabel: "Danh sách chương",
    chapterUnit: "chương",
    progressLabel: "Tiến độ học tập",
    markDone: "Đánh dấu đã học",
    markUndone: "Bỏ đánh dấu đã học",
    resetProgress: "Đặt lại",
    contentTab: "Nội dung",
    practiceTab: "Luyện tập",
  },
  curriculum: {
    summary: "Tóm tắt",
    concepts: "Khái niệm chính",
    formulas: "Công thức",
    examples: "Ví dụ",
    questions: "Câu hỏi luyện tập",
    symbols: "Ký hiệu",
    problem: "Đề bài",
    solution: "Lời giải",
    given: "Dữ kiện",
    formula: "Công thức",
    answer: "Đáp án",
    explanation: "Giải thích",
    example: "Ví dụ",
    row: "Dòng",
    trueLabel: "Đúng",
    falseLabel: "Sai",
    emptySummary: "Tài liệu này chưa có nội dung tóm tắt.",
    emptyConcepts: "Tài liệu này chưa có khái niệm chính nào.",
    emptyFormulas: "Tài liệu này không có công thức nào.",
    emptyExamples: "Tài liệu này chưa có ví dụ nào.",
    emptyQuestions: "Tài liệu này chưa có câu hỏi luyện tập nào.",
    questionTypes: {
      multiple_choice: "Trắc nghiệm",
      multiple_response: "Trắc nghiệm nhiều đáp án",
      calculation: "Tính toán",
      fill_in_the_blank: "Điền khuyết",
      true_false: "Đúng/Sai",
      table: "Bảng",
    },
  },
  concept: {
    action: "Giải thích khái niệm",
    dialogEyebrow: "AI giải thích",
    bilingualHint:
      "Giải thích song ngữ: tiếng Đức in đậm ở trên, bản dịch tiếng Việt in nghiêng bên dưới.",
    loading: "Đang phân tích khái niệm …",
    loadingHint:
      "AI đọc khái niệm trong ngữ cảnh của chương này và tạo định nghĩa, giải thích, liên hệ và phản biện.",
    errorTitle: "Chưa thể giải thích",
    errors: {
      network: "Không kết nối được dịch vụ AI. Hãy kiểm tra mạng và thử lại.",
      timeout: "Phản hồi mất quá nhiều thời gian. Hãy thử lại sau một chút.",
      upstream:
        "Dịch vụ AI hiện chưa tạo được phần giải thích. Hãy thử lại sau.",
      empty: "AI trả về nội dung không đọc được. Hãy thử lại.",
      "missing-concept":
        "Thiếu tên khái niệm trong yêu cầu. Hãy tải lại trang và thử lại.",
      "invalid-body": "Yêu cầu chưa đầy đủ. Hãy tải lại trang và thử lại.",
      "invalid-json": "Yêu cầu chưa đầy đủ. Hãy tải lại trang và thử lại.",
      unauthorized: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.",
      unknown: "Đã có lỗi xảy ra. Hãy thử lại.",
    },
    retry: "Thử lại",
    close: "Đóng",
    emptySection: "Phần này chưa có nội dung.",
    disclaimer:
      "Nội dung do AI tạo – có thể có sai sót. Hãy đối chiếu với tài liệu của bạn.",
    sections: {
      definition: "Định nghĩa",
      erklaerung: "Giải thích",
      zusammenhang: "Liên hệ",
      kritik: "Phản biện",
    },
  },
  practice: {
    title: "Trung tâm luyện tập",
    intro:
      "Chọn dạng bài, trả lời câu hỏi và bấm Kiểm tra để xem đáp án cùng giải thích chi tiết.",
    chooseFormat: "Chọn dạng bài tập",
    questionsUnit: "câu hỏi",
    questionUnit: "Câu",
    emptyFormat:
      "Chương này chưa có câu hỏi thuộc dạng bài bạn chọn. Hãy tải thêm tài liệu hoặc chọn dạng bài khác.",
    check: "Kiểm tra",
    retry: "Làm lại",
    correct: "Chính xác!",
    incorrect: "Chưa chính xác.",
    correctAnswer: "Đáp án đúng",
    explanation: "Giải thích",
    selectHint: "Chọn đáp án phù hợp.",
    inputPlaceholder: "Nhập kết quả",
    keywordPlaceholder: "Từ khóa",
    given: "Dữ kiện",
    formula: "Công thức",
    row: "Dòng",
    trueLabel: "Đúng",
    falseLabel: "Sai",
    tableHint: "Điền các ô còn trống trong bảng.",
    scoreLabel: "Kết quả",
    formats: {
      single_choice: "Trắc nghiệm 1 đáp án",
      multiple_response: "Trắc nghiệm nhiều đáp án",
      calculation: "Tính toán",
      fill_in_the_blank: "Điền khuyết / Stichwort",
      true_false: "Đúng / Sai",
      table: "Điền bảng",
    },
    hints: {
      single_choice: "Chỉ một đáp án đúng.",
      multiple_response: "Có thể có nhiều đáp án đúng.",
      calculation: "Nhập kết quả tính được.",
      fill_in_the_blank: "Điền từ khóa trọng tâm vào chỗ trống.",
      true_false: "Chọn Đúng hoặc Sai cho nhận định.",
      table: "Điền các giá trị còn thiếu trong bảng.",
    },
  },
  exam: {
    generatorTitle: "Tạo đề luyện tập mới",
    generatorIntro:
      "AI tạo câu hỏi mới từ nội dung chương này — mỗi lần bấm là một đề khác nhau.",
    countLabel: "Số câu muốn luyện",
    countHint: "Từ 1 đến 20 câu, mặc định 10.",
    generate: "Tạo đề mới",
    generating: "AI đang tạo đề...",
    generateHint: "Thường mất 30–90 giây.",
    finalTitle: "Thi kết thúc học phần",
    finalIntro:
      "Đề thi tổng hợp từ tất cả các chương của môn học — có tính giờ, tự động nộp bài và chấm điểm.",
    finalScope: "Toàn bộ chương",
    finalChapters: "Các chương trong đề",
    finalCountLabel: "Số câu hỏi",
    finalDurationLabel: "Thời gian làm bài",
    finalDurationHint: "Hết giờ hệ thống tự động nộp bài.",
    finalStart: "Bắt đầu thi",
    finalStarting: "Đang tạo đề thi...",
    finalHint:
      "AI tổng hợp kiến thức của mọi chương nên có thể mất 30–90 giây.",
    finalNoChapters:
      "Cần ít nhất một chương để tạo đề thi kết thúc học phần.",
    finalNavLabel: "Thi kết thúc học phần",
    finalNavHint: "Đề tổng hợp mọi chương, có tính giờ",
    runnerEyebrowChapter: "Đề luyện tập",
    runnerEyebrowFinal: "Thi kết thúc học phần",
    timeLeft: "Thời gian còn lại",
    timeUp: "Đã hết giờ — bài được nộp tự động.",
    autoSubmitted: "Nộp tự động khi hết giờ",
    answered: "Đã trả lời",
    submit: "Nộp bài",
    submitting: "Đang nộp...",
    exit: "Thoát",
    backToPractice: "Quay lại luyện tập",
    newExam: "Tạo đề khác",
    retry: "Làm lại",
    resultTitle: "Kết quả bài thi",
    resultPassed: "Đạt",
    resultFailed: "Chưa đạt",
    correctCount: "Câu đúng",
    incorrectCount: "Câu sai",
    unansweredCount: "Chưa trả lời",
    percentLabel: "Tỷ lệ đúng",
    gradeLabel: "Điểm",
    gradeScaleHint: "Thang điểm 10, đạt từ 5,0 (50%).",
    reviewTitle: "Chữa bài",
    errors: {
      network:
        "Không kết nối được dịch vụ AI. Hãy kiểm tra API đang chạy tại https://studygap-ai.onrender.com.",
      timeout: "AI phản hồi quá lâu. Vui lòng thử lại.",
      upstream: "Dịch vụ AI không tạo được đề. Vui lòng thử lại.",
      invalid: "AI trả về đề không hợp lệ. Vui lòng thử lại.",
      empty: "AI không trả về câu hỏi dùng được. Vui lòng thử lại.",
      "no-material":
        "Môn học này chưa có tài liệu. Hãy tải lên một tài liệu trước khi tạo đề.",
      "unknown-chapter": "Không tìm thấy chương này. Hãy tải lại trang.",
      "unknown-subject": "Không tìm thấy môn học.",
      "invalid-body": "Yêu cầu không hợp lệ.",
      "invalid-json": "Yêu cầu không hợp lệ.",
      unknown: "Không tạo được đề. Vui lòng thử lại.",
    },
  },
  newSubject: {
    metaTitle: "Tạo môn học mới",
    back: "Quay lại danh sách môn học",
    eyebrow: "Môn học mới",
    title: "Thêm môn học",
    intro:
      "Điền tên tiếng Đức và tiếng Việt cho môn học. Sau đó bạn có thể tải tài liệu đầu tiên lên ngay.",
    nameDeLabel: "Tên tiếng Đức",
    nameDeHint: "Được dùng làm tiêu đề chính trên trang môn học.",
    nameDePlaceholder: "ví dụ: Statistik I",
    nameViLabel: "Tên tiếng Việt",
    nameViHint: "Hiển thị khi giao diện chuyển sang tiếng Việt.",
    nameViPlaceholder: "ví dụ: Thống kê I",
    descriptionLabel: "Mô tả",
    descriptionHint: "Một hai câu tóm tắt nội dung của môn học.",
    descriptionPlaceholder:
      "ví dụ: Thống kê mô tả, xác suất và kiểm định giả thuyết.",
    optional: "không bắt buộc",
    submit: "Tạo môn học",
    submitting: "Đang tạo môn học...",
    cancel: "Huỷ",
    errors: {
      nameDe: "Vui lòng nhập tên tiếng Đức của môn học.",
      nameVi: "Vui lòng nhập tên tiếng Việt của môn học.",
      tooLong:
        "Nội dung quá dài: tối đa 120 ký tự cho mỗi tên và 600 ký tự cho phần mô tả.",
      network:
        "Không kết nối được tới máy chủ. Vui lòng kiểm tra kết nối và thử lại.",
      save: "Không lưu được môn học. Vui lòng thử lại.",
    },
  },
  upload: {
    metaTitle: "Tải tài liệu lên",
    back: "Quay lại danh sách môn học",
    eyebrow: "Tài liệu môn học",
    title: "Tải tài liệu lên",
    intro:
      "Chọn môn học rồi tải một hoặc nhiều tài liệu lên Studygap để tóm tắt nội dung và tạo bài tập cho môn đó.",
    subjectLabel: "Môn học",
    subjectHint:
      "Kết quả phân tích sẽ được gắn với môn học này và hiển thị trên trang chi tiết của môn.",
    dropTitle: "Kéo thả một hoặc nhiều tệp vào đây",
    dropSubtitle: "hoặc chọn nhiều tệp từ máy của bạn",
    chooseFile: "Chọn tệp",
    hint: "Hỗ trợ PDF, Word, Excel, Text, tối đa 20 MB mỗi tệp, tối đa 10 tệp",
    remove: "Xóa",
    selectedFilesLabel: "Tệp đã chọn",
    clearAll: "Xóa tất cả",
    errors: {
      unsupported:
        "Chỉ hỗ trợ PDF, Word (.docx), Excel (.xlsx), Text (.txt) và CSV (.csv).",
      tooLarge: "Tệp không được vượt quá 20 MB.",
      tooMany: "Chỉ có thể xử lý tối đa 10 tệp trong một lần.",
      noFile: "Vui lòng chọn ít nhất một tệp trước khi tải lên.",
      network:
        "Không kết nối được tới máy chủ. Hãy kiểm tra API đang chạy tại https://studygap-ai.onrender.com.",
      unexpected: "Không thể xử lý tệp này. Vui lòng thử lại.",
      save: "Không thể lưu kết quả vào cơ sở dữ liệu. Vui lòng thử lại.",
    },
    processingHint:
      "Các tệp được xử lý lần lượt; mỗi tệp hoàn tất được lưu ngay thành một chương riêng.",
    processingTitle: "AI đang xử lý tài liệu của bạn",
    waitingForAi: "Đang chờ AI trả kết quả...",
    queueWaiting: "Đang chờ trong hàng đợi...",
    fileProgressLabel: "Tệp",
    saving: "Đang lưu kết quả...",
    redirecting: "Đang mở trang môn học...",
    resultHeading: "Kết quả xử lý tài liệu",
    resultUntitled: "Chưa có tiêu đề",
    resultPagesLabel: "Trang",
    resultFilesUnit: "tệp",
    resultSuccessBadge: "Hoàn tất",
    resultFailedBadge: "Lỗi",
    resultFailedHint: "Không thể xử lý tệp này.",
    resultTruncatedNote:
      "Tài liệu quá dài nên AI chỉ phân tích phần đầu của tài liệu.",
    chapterSavedBadge: "Đã lưu",
    chapterListHeading: "Các chương từ lần tải lên này",
    chapterListHint: "Mỗi tệp được lưu thành một chương riêng.",
    openSubjectPage: "Mở trang môn học",
    cancel: "Hủy",
    submit: "Tải lên",
    uploading: "Đang xử lý tài liệu...",
  },
  login: {
    metaTitle: "Đăng nhập",
    title: "Chào mừng trở lại",
    intro:
      "Khu vực này là riêng tư. Hãy đăng nhập bằng tên đăng nhập và mật khẩu của bạn để mở Studygap.",
    google: "Đăng nhập bằng Google",
    googleRedirecting: "Đang chuyển đến Google...",
    usernameLabel: "Tên đăng nhập",
    passwordLabel: "Mật khẩu",
    submit: "Đăng nhập",
    submitting: "Đang đăng nhập...",
    invalidCredentials: "Tên đăng nhập hoặc mật khẩu không đúng.",
    missingFields: "Vui lòng nhập tên đăng nhập và mật khẩu.",
    networkError: "Đăng nhập thất bại. Hãy kiểm tra kết nối và thử lại.",
    sessionHint: "Phiên đăng nhập được lưu trong 30 ngày.",
    language: "Ngôn ngữ trang đăng nhập",
  },
  notFound: {
    title: "Không tìm thấy trang",
    description:
      "Môn học hoặc đường dẫn bạn tìm không tồn tại. Hãy quay về trang chủ để chọn một môn học khác.",
    home: "Về trang chủ",
  },
  footer: "Studygap – học chậm mà chắc.",
};

const dictionaries: Record<Locale, Dictionary> = { de, vi };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
