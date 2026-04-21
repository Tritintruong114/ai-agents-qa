const CONTRACT_JSON = `{
  "evidence_quote": "string - Exact verbatim extraction to facilitate KSL review",
  "reasoning": "string - Chain-of-Thought logical explanation against SEC 17a-4",
  "is_ui_description": "boolean - True if strictly a UI description",
  "compliance_status": "enum ('PASS', 'WARNING', 'FAIL')",
  "confidence_score": "float (0.0 - 1.0) - Used for Dynamic Routing"
}`;

function TypeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 rounded-md border border-[#0066ff]/40 bg-[#0066ff]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0066ff]">
      {label}
    </span>
  );
}

const FIELD_ROWS: {
  name: string;
  badgeLabel: string;
  detail: string;
}[] = [
  {
    name: "evidence_quote",
    badgeLabel: "string",
    detail: "Exact verbatim extraction to facilitate KSL review",
  },
  {
    name: "reasoning",
    badgeLabel: "string",
    detail: "Chain-of-thought vs SEC 17a-4 before any verdict",
  },
  {
    name: "is_ui_description",
    badgeLabel: "boolean",
    detail: "True only when impact is strictly UI-local",
  },
  {
    name: "compliance_status",
    badgeLabel: "enum",
    detail: "PASS · WARNING · FAIL",
  },
  {
    name: "confidence_score",
    badgeLabel: "float",
    detail: "0.0–1.0 for dynamic routing / calibration",
  },
];

export function DataContractsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-black">
          Output Data Contract{" "}
          <code className="rounded-md bg-[#0066ff] px-2 py-0.5 font-mono text-sm font-semibold text-white">
            QAEvaluationResult
          </code>
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-800">
          The strict Pydantic schema that enforces the Semantic Contract for the
          LLM. Any violation of this schema triggers the{" "}
          <code className="rounded bg-black px-1.5 py-0.5 font-mono text-xs text-white">
            CIRCUIT_BREAKER
          </code>{" "}
          to prevent CI/CD pipeline crashes.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-700">
          <span className="font-semibold text-neutral-900">SSE / API:</span> The
          stream&apos;s <code className="rounded border border-neutral-200 bg-neutral-50 px-1 font-mono text-xs">final_result</code>{" "}
          merges these five fields with additional keys from{" "}
          <code className="rounded border border-neutral-200 bg-neutral-50 px-1 font-mono text-xs">
            backend/main.py
          </code>{" "}
          (for example{" "}
          <code className="rounded border border-neutral-200 bg-neutral-50 px-1 font-mono text-xs">
            readability_dimension
          </code>
          ,{" "}
          <code className="rounded border border-neutral-200 bg-neutral-50 px-1 font-mono text-xs">
            routing_decision
          </code>
          ,{" "}
          <code className="rounded border border-neutral-200 bg-neutral-50 px-1 font-mono text-xs">
            llm_compliance_status
          </code>
          ,{" "}
          <code className="rounded border border-neutral-200 bg-neutral-50 px-1 font-mono text-xs">
            llm_reasoning
          </code>
          ) — see{" "}
          <code className="rounded border border-neutral-200 bg-neutral-50 px-1 font-mono text-xs">
            _evaluate_response_payload
          </code>
          .
        </p>
      </div>

      <div
        className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm ring-1 ring-[#0066ff]/15"
        role="note"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0066ff]">
          Schema order (bias control)
        </p>
        <p className="mt-2 text-sm leading-relaxed text-black">
          <strong className="font-semibold">Evidence</strong> (
          <code className="rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 font-mono text-xs text-black">
            evidence_quote
          </code>
          ) and{" "}
          <strong className="font-semibold">reasoning</strong> (
          <code className="rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 font-mono text-xs text-black">
            reasoning
          </code>
          ){" "}
          <strong>must</strong> appear <strong>before</strong>{" "}
          <code className="rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 font-mono text-xs text-black">
            is_ui_description
          </code>{" "}
          and{" "}
          <code className="rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 font-mono text-xs text-black">
            compliance_status
          </code>{" "}
          in the structured output contract so the model commits to analysis
          before labeling PASS / WARNING / FAIL — reducing choice-supportive
          bias.
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-black">
          Field shape (reference — not strict JSON)
        </h3>
        <pre
          className="overflow-x-auto rounded-xl border-2 border-black bg-black p-4 text-sm leading-relaxed text-white shadow-sm"
          tabIndex={0}
        >
          <code className="font-mono">{CONTRACT_JSON}</code>
        </pre>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-black">
          Fields &amp; types
        </h3>
        <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {FIELD_ROWS.map((row) => (
            <li
              key={row.name}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0 flex flex-wrap items-center gap-2">
                <code className="font-mono text-sm font-semibold text-black">
                  {row.name}
                </code>
                <TypeBadge label={row.badgeLabel} />
              </div>
              <p className="text-sm text-neutral-700 sm:text-right">
                {row.detail}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-neutral-600">
        Source of truth in repo:{" "}
        <code className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-neutral-900">
          backend/contracts.py
        </code>
        .
      </p>
    </div>
  );
}
