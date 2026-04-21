import {
  API_DOCS_URL,
  API_OPENAPI_JSON_URL,
  API_REDOC_URL,
} from "@/lib/constants";

const linkClass =
  "font-medium text-[#0066ff] underline-offset-2 hover:text-[#0052cc] hover:underline";

const entries = [
  {
    label: "Swagger UI",
    shortLabel: "Swagger",
    description: "Interactive /docs",
    href: API_DOCS_URL,
  },
  {
    label: "ReDoc",
    shortLabel: "ReDoc",
    description: "Alternate docs /redoc",
    href: API_REDOC_URL,
  },
  {
    label: "OpenAPI JSON",
    shortLabel: "OpenAPI",
    description: "Machine-readable schema",
    href: API_OPENAPI_JSON_URL,
  },
] as const;

/** Full list — legacy / optional use */
export function ApiDocsLinks() {
  return (
    <div className="mt-3 text-left">
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        Backend API (FastAPI, auto-generated)
      </p>
      <ul className="mt-1.5 space-y-1 text-[11px] leading-snug text-neutral-600 sm:text-xs">
        {entries.map(({ label, description, href }) => (
          <li key={href}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
              title={description}
            >
              <span className="font-medium text-neutral-700">{label}</span>
              <span className="text-neutral-400"> — </span>
              <span className="font-mono text-[10px] sm:text-[11px]">{href}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Compact single row for toolbar (label only; full URL in title). */
export function ApiDocsLinksOneLine() {
  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-x-1 text-[10px] font-medium leading-none sm:text-[11px]">
      {entries.map(({ label, shortLabel, description, href }, i) => (
        <span key={href} className="inline-flex items-center gap-x-1">
          {i > 0 ? (
            <span className="text-neutral-300 select-none" aria-hidden>
              |
            </span>
          ) : null}
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkClass} whitespace-nowrap`}
            title={`${label} — ${href}\n${description}`}
          >
            {shortLabel}
          </a>
        </span>
      ))}
    </div>
  );
}
