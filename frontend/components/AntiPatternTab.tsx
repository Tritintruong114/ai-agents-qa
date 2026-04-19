import { formatAntiPatternDate } from "@/lib/evaluation-helpers";
import type { AntiPatternRow } from "@/lib/types";

type Props = {
  rows: AntiPatternRow[];
  loading: boolean;
  error: string | null;
};

export function AntiPatternTab({ rows, loading, error }: Props) {
  return (
    <div className="space-y-4">
      <div
        className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-950 shadow-sm"
        role="status"
      >
        <p className="font-semibold text-sky-950">
          Decoupled architecture
        </p>
        <p className="mt-2 text-sky-900">
          The generation agent and the QA agent are fully separated. Before
          drafting new copy, the generator queries (RAG) this Anti-Pattern store
          for past mistakes as negative few-shot examples—supporting continuous
          improvement without confirmation bias.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-600">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-neutral-600">
          No FAIL/WARNING rows in the audit trail yet. Run evaluations to
          populate Anti-Patterns.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const st = String(row.compliance_status).toUpperCase();
            const isFail = st === "FAIL";
            return (
              <li
                key={row.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${
                      isFail
                        ? "border-red-200 bg-red-50 text-red-800"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                    }`}
                  >
                    {row.compliance_status}
                  </span>
                  <time
                    className="text-xs text-neutral-500"
                    dateTime={row.created_at}
                  >
                    {formatAntiPatternDate(row.created_at)}
                  </time>
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Reasoning:
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
                  {row.reasoning || "—"}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-neutral-100 pt-3 text-xs text-neutral-600">
                  <span>
                    Temp:{" "}
                    <span className="font-mono font-semibold text-black">
                      {Number(row.temperature).toFixed(1)}
                    </span>
                  </span>
                  <span>
                    Tokens:{" "}
                    <span className="font-mono font-semibold text-black">
                      {row.prompt_tokens} prompt + {row.completion_tokens}{" "}
                      completion
                    </span>
                  </span>
                  <span className="text-neutral-500">
                    Case #{row.test_case_id}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
