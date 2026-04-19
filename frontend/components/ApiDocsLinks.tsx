import {
  API_DOCS_URL,
  API_OPENAPI_JSON_URL,
  API_REDOC_URL,
} from "@/lib/constants";

const linkClass =
  "break-all text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline";

const entries = [
  { label: "Swagger UI", description: "Interactive /docs", href: API_DOCS_URL },
  { label: "ReDoc", description: "Alternate docs /redoc", href: API_REDOC_URL },
  {
    label: "OpenAPI JSON",
    description: "Machine-readable schema",
    href: API_OPENAPI_JSON_URL,
  },
] as const;

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
