# Studygap

A bilingual (German / Vietnamese) study-material browser built with Next.js 16
(App Router), React 19, Tailwind CSS 4 and TypeScript. The whole app is private:
a single login protects every page and API route.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root URL redirects to
the last selected language (falling back to Vietnamese).

## Routes

| Route                   | Description                                        |
| ----------------------- | -------------------------------------------------- |
| `/`                     | Redirects to the preferred locale (`/vi` by default) |
| `/[lang]`               | Subject list (`de` or `vi`)                        |
| `/[lang]/login`         | Login form (localized, centered card, no app header) |
| `/login`                | Legacy URL: redirects to `/[lang]/login`           |
| `/[lang]/subject/[id]`  | Learning path: chapters, progress, content and practice center |
| `/[lang]/upload`        | Document upload (multi-file, calls the studygap-ai API) |
| `POST /api/auth/login`  | Checks the credentials and stores the session cookie |
| `POST /api/auth/logout` | Ends the Google (Auth.js) session and clears the credentials cookie |
| `POST /api/documents`   | Stores one AI result for a subject in SQLite       |
| `POST /api/exams`       | Generates + stores an AI paper (chapter practice or final exam) |
| `POST /api/concepts`    | Explains one key concept with the AI (definition, explanation, context, critique) |

## Login (single-user access)

Every page and API route is private. The proxy checks a signed, HTTP-only
session cookie before rendering: visitors without a valid session are sent to
`/[lang]/login?next=<requested path>` (API requests get a `401` JSON response
instead). After a successful login the form continues to `next`; the path is
validated so `?next=` can neither leave the site nor point back at a login page
(which would loop between the proxy and the form).

- `app/[lang]/layout.tsx` – root layout of every localized route: only the
  document (`<html lang>`, `dir`, `<body>`), fonts and metadata.
- `app/[lang]/(app)/layout.tsx` – shell of the private app: header with
  navigation, language switcher and logout button, plus the footer.
- `app/[lang]/(auth)/layout.tsx` – centered card shell of the login route, with
  no app chrome. `(auth)` is a route group, so it does not appear in the URL:
  the page is `/[lang]/login`.
- `app/[lang]/(auth)/login/page.tsx` – login card. The language comes from the
  URL segment (`/de/login`, `/vi/login`); the DE/VI pills link to the same page
  in the other language and carry `?next=` over, rewriting its locale prefix.
- `app/[lang]/(auth)/login/login-form.tsx` – client form that posts to the API.
- `lib/auth.ts` – credentials from the environment, HMAC-SHA256 signed session
  tokens (Web Crypto, so the proxy and route handlers share the code), constant
  time comparison and the `next` path validation.
- `app/api/auth/login/route.ts` / `app/api/auth/logout/route.ts` – set/clear the
  `studygap-session` cookie (HttpOnly, SameSite=Lax, 30 days). The logout route
  also calls the server `signOut` of Auth.js, so a Google session is deleted
  from the `Session` table instead of being left behind for the proxy.
- `components/logout-button.tsx` – "Abmelden / Đăng xuất" in the app header.
  It clears the credentials cookie and then calls `signOut` from
  `next-auth/react` (`redirectTo: '/<lang>/login'`), which removes the Auth.js
  session and does a hard navigation back to the login page.

### Credentials

The login is defined in `.env` (defaults are used when the variables are unset):

| Variable             | Default              | Purpose                                                    |
| -------------------- | -------------------- | ---------------------------------------------------------- |
| `AUTH_USERNAME`      | `admin`              | Login name                                                 |
| `AUTH_PASSWORD`      | `Imachi.051937`      | Password                                                   |
| `AUTH_SECRET`        | dev default          | Key that signs the session cookie                          |
| `AUTH_COOKIE_SECURE` | `true` in production | Set to `false` only for a production build over plain HTTP |

The default credentials are `admin` / `Imachi.051937` — change them before the app
is reachable from another machine:

1. Edit `.env` and set `AUTH_USERNAME` and `AUTH_PASSWORD`.
2. Generate a fresh secret and set it as `AUTH_SECRET`:
   `node -p "crypto.randomBytes(32).toString('base64url')"` (or
   `openssl rand -base64 32`). Changing the secret signs every existing session
   out, so do it whenever you rotate the password.
3. Restart the server (`npm run dev` / `npm run start`) — the env values are read
   on the server at request time, no code change or rebuild is needed. On a
   hosting platform, update the variables and redeploy/restart the service.

`AUTH_*` variables are server-only — they are never inlined into the browser
bundle. Use HTTPS in production: the cookie is `Secure` there, so a production
build served over plain HTTP would drop it (uncomment `AUTH_COOKIE_SECURE="false"`
if you must run that way, e.g. over a LAN IP).

This is intentionally a small single-user solution: one static credential pair,
no user table, no rate limiting and no "remember this device" list. For several
users or public sign-up, use an auth library instead.

## Internationalization

- `lib/locales.ts` – supported locales (`de`, `vi`), the default locale (`vi`),
  the cookie name, `localeDirection()` and locale helpers. The direction is
  explicit: `rtl` only for right-to-left language codes (Hebrew, Arabic, …) and
  `ltr` for everything else. `<html>` is rendered with an explicit `lang` and
  `dir`, so the shell can never inherit an RTL direction from the browser or an
  extension.
- `lib/i18n.ts` – typed UI dictionaries for German and Vietnamese.
- `lib/subjects.ts` – subject metadata (id, name, code, semester, summary) with localized names and
  summaries. Learning material now comes from the database.
- `proxy.ts` – login gate for pages and API routes (public: `/*/login` and the
  auth endpoints), redirects unprefixed paths to the preferred locale (including
  the legacy `/login`), remembers the choice in the `studygap-lang` cookie, and
  routes unknown subject slugs to the localized 404 page.
- `app/[lang]/(app)/layout.tsx` – app header, navigation, language switcher and
  the logout button for every page except the login form.
- `app/global-not-found.tsx` – localized global 404 (needed because the root
  layout uses a top-level dynamic `[lang]` segment).

The language switcher keeps the current path, so
`/vi/subject/bwl-einfuehrung` becomes `/de/subject/bwl-einfuehrung`. UI labels,
metadata, validation messages and 404 pages follow the selected language. Subject
names are shown in the active language with the other language as a secondary
label.

## Database (Prisma 7 + SQLite)

- `prisma/schema.prisma` – `Subject`, `Document` and `Exam` models.
- `prisma.config.ts` – Prisma CLI config; reads `DATABASE_URL` from `.env` and
  falls back to `file:./dev.db` when it is unset, so `prisma generate` also works
  on a CI/Vercel build without environment variables or a database file.
- `lib/prisma.ts` – Prisma Client singleton using the `better-sqlite3` driver
  adapter (required by Prisma 7).
- `lib/subject-documents.ts` – reads/writes the `Document` table. `Document.content`
  stores the JSON returned by studygap-ai and is normalised with
  `parseCurriculum` (`lib/curriculum.ts`) before it reaches the UI.
- `lib/chapters.ts` – turns the documents of a subject into the ordered chapter
  list (Kapitel) shown in the sidebar.
- `lib/practice.ts` – groups questions into the practice formats and grades the
  answers (choices, numbers, keywords, true/false, table cells).
- `lib/exam.ts` – pure exam domain: question count/duration limits, the
  `GeneratedExam` shape, `gradeExam` and the German / Vietnamese grade scale.
- `lib/api-url.ts` – one normaliser for the studygap-ai base URL
  (`https://studygap-ai.onrender.com`). It trims the env value, removes trailing
  slashes and keeps the URL on HTTPS, for both the server and the browser.
- `lib/exam-service.ts` – builds the compact "knowledge framework" from the
  stored chapters, calls `POST /generate-exam` on the AI service, filters and
  de-duplicates the returned questions, and persists the paper in the `Exam`
  table. It uses `STUDYGAP_API_URL` (falling back to
  `NEXT_PUBLIC_STUDYGAP_API_URL`, then `https://studygap-ai.onrender.com`).
  The upload page calls `POST /process-document` from the browser, so there the
  API address comes from `NEXT_PUBLIC_STUDYGAP_API_URL` (inlined at build time,
  same Render fallback). Both go through `normalizeApiBaseUrl` (`lib/api-url.ts`),
  so the requests always hit
  `https://studygap-ai.onrender.com/generate-exam` and
  `https://studygap-ai.onrender.com/process-document`. Because the browser talks
  to `studygap-ai.onrender.com` directly, the FastAPI service must allow this
  site's origin via CORS.
- `lib/concept.ts` / `lib/concept-service.ts` / `lib/concept-client.ts` – the
  AI concept explainer. The browser calls `POST /api/concepts`
  (`lib/concept-client.ts`), the route handler forwards the request to
  `POST /explain-concept` with the server-only `STUDYGAP_API_URL`
  (`lib/concept-service.ts`), and `lib/concept.ts` holds the shared four-section
  contract (`definition`, `erklaerung`, `zusammenhang`, `kritik`) plus a
  defensive parser, because the model may answer a section with a list or an
  object instead of a string.

```bash
npm run db:push      # create/update the SQLite tables (dev.db)
npm run db:generate  # regenerate lib/generated/prisma
npm run db:studio    # browse the data
```

`Document.subjectId` stores the subject slug from `lib/subjects.ts` (for example
`bwl-einfuehrung`). Each row also stores the output `language` (`de` or `vi`),
the page count, whether the AI input was truncated and a `title` used as the
chapter name (the AI title, falling back to a readable file name). Every stored
PDF is one chapter of the subject's learning path.

The upload page posts every successful result to `POST /api/documents`
(`{ subjectId, fileName, language, pages?, truncated?, curriculum }`), then
redirects to `/[lang]/subject/[id]`. The subject page lets the learner switch
between chapters in the sidebar, tick chapters as learned (progress is stored
per browser in `localStorage`, key `studygap:subject-progress:<subjectId>`),
read the chapter content (summary, key concepts, formulas, examples) and open
the practice center, which offers one tab per exercise format: single choice,
multiple response, calculation, fill-in-the-blank/Stichwort, true/false and
fill-in-the-table. Each task has a check button that reveals the correct answer
and the explanation. Content in the other language is not mixed in; a hint is
shown instead. Chapter, tab and practice format can be deep-linked with
`?chapter=<document id>&tab=practice&format=<format>`.

The subject page also works as an exam center:

- **Custom chapter paper** – every chapter's practice tab has an "Anzahl der
  Aufgaben / Số câu muốn luyện" field and a "Neues Blatt erstellen / Tạo đề mới"
  button. `POST /api/exams` sends that chapter's framework to the AI (new
  questions only, mixed formats) and opens the untimed practice runner; submit
  reveals the score and the explanation for every question.
- **Final exam** – the sidebar entry below the chapter list opens the final exam
  setup (every chapter of the subject, 5–30 questions, 30/60/90/120 minutes).
  The runner shows a countdown, submits automatically when the time is up and
  reports correct/incorrect/unanswered counts, percentage and the final grade
  (German 1,0–5,0 scale, Vietnamese 10-point scale, pass ≥ 50 %).
- Generated papers are stored in `Exam` (`content` = `{ chapters, questions }`),
  so a reload resumes them. `?exam=<id>` deep-links to a stored paper; the
  attempt start time is kept per browser
  (`studygap:exam-start:<exam id>`) so the timer survives a reload while a stale
  attempt (already expired) starts fresh.

Every key concept in the chapter content is a button ("Begriff erklären / Giải
thích khái niệm"). Clicking it calls `POST /api/concepts` with the concept name
and the current chapter summary/formulas as `context`, shows a loading state and
then the answer in a modal with the four sections Definition, Erklärung,
Zusammenhang and Kritik. Failures show a friendly, localized message with a
retry button; Escape, the backdrop and the close button dismiss the dialog and
return focus to the card.

The AI service receives the UI locale as the optional multipart field `lang`
(`de` / `vi`) and is instructed to write the curriculum in that language, so a
German upload produces German content and a Vietnamese upload Vietnamese. Its
JSON contract contains `teaching` (summary, key concepts, formulas, examples)
and 10 `questions` covering the practice formats, so every practice tab has
material for a fresh upload.

## Scripts

```bash
npm run dev         # development server
npm run build       # generate the Prisma Client, then build Next.js
npm run start       # serve the production build
npm run lint        # ESLint
```

`lib/generated/` is git-ignored, so a fresh clone has no Prisma Client.
`npm run build` therefore runs `prisma generate` first (and the `postinstall`
script repeats it after `npm install`), which is exactly what a Vercel build
needs — no manual generation step and no committed generated code.

## Deployment (Vercel)

Import the repository, keep the default framework preset (build command
`npm run build`, output `.next`) and add the environment variables:

| Variable                       | Purpose                                                        |
| ------------------------------ | -------------------------------------------------------------- |
| `AUTH_USERNAME`                | Login name (default `admin`)                                    |
| `AUTH_PASSWORD`                | Password (default `Imachi.051937` — change it!)                 |
| `AUTH_SECRET`                  | Long random value that signs the session cookie                 |
| `STUDYGAP_API_URL`             | Server-side base URL of studygap-ai (`https://studygap-ai.onrender.com`) |
| `NEXT_PUBLIC_STUDYGAP_API_URL` | Same URL for the browser; inlined at build time                 |
| `DATABASE_URL` (optional)      | SQLite connection string; defaults to `file:./dev.db`           |

`AUTH_*` and `STUDYGAP_API_URL` are read at request time, so changing them only
needs a redeploy. `NEXT_PUBLIC_*` is baked into the bundle, so it needs a rebuild.

**SQLite caveat:** a Vercel function has no persistent disk (only `/tmp`), so
`dev.db` is not shared between requests or deployments. The pages, the login and
the AI calls work, but uploaded documents and generated exams are not stored
durably. For a real deployment use a hosted database (Postgres, Turso, …) and
point the Prisma datasource at it.

