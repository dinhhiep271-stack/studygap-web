"use client";

import { Children, Fragment, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Markdown renderer for the structured sections of the concept explainer.
 *
 * `pflegeplanung` of the medical contract is not prose: the AI service answers
 * it with one GFM table (Pflegediagnose / Ziel / Maßnahmen / Begründung), so the
 * concept dialog renders that section through this component instead of a
 * `whitespace-pre-line` paragraph. GFM is enabled with `remark-gfm`, otherwise
 * the pipe table arrives as plain text.
 *
 * The project does not load `@tailwindcss/typography`, so every element is
 * styled explicitly: the table gets a border, a coloured header row, zebra
 * stripes and a horizontal scroll container for narrow screens.
 */

function MarkdownTable({ children }: { children?: ReactNode }) {
  return (
    <div className="my-2 overflow-x-auto rounded-lg border border-emerald-200 bg-white shadow-sm">
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  );
}

/** `<br>`, `<br/>` and `<br />` as the model may write them inside a cell. */
const lineBreakTag = /<br\s*\/?>/gi;

/**
 * Turns the `<br>` tags the model puts into a table cell into real line breaks.
 * Raw HTML stays disabled (no `rehype-raw`), so react-markdown would otherwise
 * escape them and the cell would show a literal `<br>`.
 */
function withLineBreaks(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child !== "string") {
      return child;
    }

    const parts = child.split(lineBreakTag);

    if (parts.length === 1) {
      return child;
    }

    return parts.map((part, index) => (
      <Fragment key={index}>
        {index > 0 ? <br /> : null}
        {part}
      </Fragment>
    ));
  });
}

const markdownComponents: Components = {
  table: MarkdownTable,
  thead: ({ children }) => (
    <thead className="bg-emerald-600 text-white">{children}</thead>
  ),
  tr: ({ children }) => (
    <tr className="align-top even:bg-emerald-50/50">{children}</tr>
  ),
  th: ({ children }) => (
    <th
      scope="col"
      className="border-r border-emerald-500/60 px-3 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap uppercase last:border-r-0"
    >
      {withLineBreaks(children)}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-t border-r border-emerald-100 px-3 py-2.5 leading-6 text-zinc-700 last:border-r-0">
      {withLineBreaks(children)}
    </td>
  ),
  p: ({ children }) => <p className="leading-7">{children}</p>,
  ul: ({ children }) => (
    <ul className="my-1.5 list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1.5 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-6">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => (
    <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.8em] text-zinc-800">
      {children}
    </code>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
    >
      {children}
    </a>
  ),
};

export function ConceptMarkdown({
  content,
  lang,
  className,
}: {
  /** Raw Markdown of one section (as returned by `/explain-concept`). */
  content: string;
  /** BCP-47 tag of the text (`de` / `vi`) for hyphenation and screen readers. */
  lang?: string;
  /** Typography/colour of the surrounding text, e.g. muted for the translation. */
  className?: string;
}) {
  return (
    <div lang={lang} className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
