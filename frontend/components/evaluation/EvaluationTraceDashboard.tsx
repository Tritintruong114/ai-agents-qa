import { ComplianceBadge } from "./Badges";
import {
  buildAuditSummaryLine,
  fallbackLlmReasoning,
  gateBadgeClass,
  overallEmoji,
} from "./evaluation-trace-utils";
import {
  formatStabilityRemainderLine,
  normalizeStatus,
  stabilityAggregateEmoji,
  type StabilityVerdictBreakdown,
} from "@/lib/evaluation-helpers";
import type { EvaluatePayload } from "@/lib/types";
import type { TestCase } from "@/lib/constants";

function fmtTokens(n: number): string {
  return n.toLocaleString("en-US");
}

type Props = {
  testCase: TestCase;
  runIndex1Based: number;
  runCount: number;
  temperature: number;
  stabilityPct: number | null;
  goldenMatchCount: number;
  stabilityBreakdown: StabilityVerdictBreakdown;
  data: EvaluatePayload;
  snapshotPromptTokens: number;
  snapshotCompletionTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  modelLabel?: string;
};

export function EvaluationTraceDashboard({
  testCase,
  runIndex1Based,
  runCount,
  temperature,
  stabilityPct,
  goldenMatchCount,
  stabilityBreakdown,
  data,
  snapshotPromptTokens,
  snapshotCompletionTokens,
  totalPromptTokens,
  totalCompletionTokens,
  modelLabel,
}: Props) {
  const overall = normalizeStatus(data.compliance_status);
  const llmStatus =
    (data.llm_compliance_status as string | undefined) ??
    String(data.compliance_status ?? "—");
  const rd = data.readability_dimension;
  const llmText = fallbackLlmReasoning(data.reasoning, data.llm_reasoning);
  const auditSummary = buildAuditSummaryLine(data, overall);
  const primaryModel = modelLabel ?? "LLM (Pydantic AI)";
  const stabilityRemainderLine = formatStabilityRemainderLine(
    runCount,
    stabilityBreakdown,
  );

  return (
    <div className="space-y-4">
      {/* 1 · Test meta */}
      <section
        className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        aria-labelledby="trace-meta-heading"
      >
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
          <span className="text-lg" aria-hidden>
            🛡️
          </span>
          <h4
            id="trace-meta-heading"
            className="text-[11px] font-bold uppercase tracking-widest text-neutral-600"
          >
            Test meta
          </h4>
        </div>
        <dl className="mt-3 space-y-2.5 text-sm text-neutral-800">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Target
            </dt>
            <dd className="mt-0.5 leading-relaxed">
              <ul className="list-inside list-disc space-y-1 text-neutral-700">
                {testCase.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Expected outcome
            </dt>
            <dd className="mt-0.5 font-mono text-xs text-neutral-800">
              {testCase.expected}
            </dd>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-neutral-100 pt-3">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                Stability configuration
              </dt>
              <dd className="mt-0.5 font-mono text-xs">
                {runCount} runs · temp {temperature.toFixed(1)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                Stability score
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-neutral-900">
                {stabilityPct !== null ? (
                  <>
                    <span aria-hidden>
                      {stabilityAggregateEmoji(stabilityBreakdown)}{" "}
                    </span>
                    {stabilityPct}% ({goldenMatchCount}/{runCount} match{" "}
                    {testCase.expectedVerdict})
                    {stabilityRemainderLine ? (
                      <span className="font-normal text-neutral-600">
                        {" "}
                        · {stabilityRemainderLine}
                      </span>
                    ) : null}
                  </>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </div>
        </dl>
      </section>

      {/* 2 · Multi-layer gate execution */}
      <section
        className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        aria-labelledby="trace-exec-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden>
              🚦
            </span>
            <h4
              id="trace-exec-heading"
              className="text-[11px] font-bold uppercase tracking-widest text-neutral-600"
            >
              Multi-layer gate execution
            </h4>
          </div>
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-neutral-700">
            Run {runIndex1Based}/{runCount} snapshot
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50/80 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase text-neutral-500">
              Overall verdict
            </span>
            {overall ? (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden>{overallEmoji(overall)}</span>
                <ComplianceBadge status={overall} />
              </span>
            ) : (
              <span className="text-sm text-neutral-500">—</span>
            )}
          </div>
          {data.routing_decision ? (
            <>
              <span className="hidden text-neutral-300 sm:inline">|</span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase text-neutral-500">
                  Routing (Q8)
                </span>
                <code className="rounded bg-white px-2 py-0.5 font-mono text-xs text-neutral-900 shadow-sm">
                  {data.routing_decision}
                </code>
                <span className="text-[10px] text-neutral-500">
                  {data.is_shadow_mode === false
                    ? "enforcement"
                    : "shadow (log only)"}
                </span>
              </div>
            </>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-neutral-200 border-l-4 border-l-blue-600 bg-white p-3 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-blue-900">
                Gate 1 · Semantic compliance (Dim 03 · SEC 17a-4)
              </span>
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${gateBadgeClass(llmStatus)}`}
              >
                {llmStatus}
              </span>
            </div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase text-neutral-500">
              Status
            </p>
            <p className="mb-3 text-sm text-neutral-800">
              <span className="inline-flex items-center gap-1.5">
                {overallEmoji(llmStatus)}
                <span className="font-medium">{llmStatus}</span>
              </span>
              {data.is_ui_description !== undefined ? (
                <span className="text-neutral-600">
                  {" "}
                  ·{" "}
                  <code className="rounded bg-neutral-100 px-1 font-mono text-xs">
                    is_ui_description: {String(data.is_ui_description)}
                  </code>
                </span>
              ) : null}
            </p>
            <p className="mb-1 text-[10px] font-semibold uppercase text-neutral-500">
              Engine
            </p>
            <p className="font-mono text-xs text-neutral-800">{primaryModel}</p>
            <p className="mb-2 mt-2 text-[10px] font-semibold uppercase text-neutral-500">
              Reasoning
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-800">
              {llmText}
            </p>
            {data.evidence_quote?.trim() ? (
              <div className="mt-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase text-neutral-500">
                  Evidence quote
                </p>
                <blockquote className="rounded border border-blue-200 bg-blue-50/60 px-2.5 py-2 font-mono text-xs leading-relaxed text-neutral-900">
                  {data.evidence_quote}
                </blockquote>
              </div>
            ) : null}
            {data.confidence_score !== undefined ? (
              <p className="mt-2 border-t border-neutral-100 pt-2 text-xs text-neutral-500">
                <span className="font-semibold text-neutral-600">
                  confidence_score:{" "}
                </span>
                <span className="font-mono">
                  {data.confidence_score.toFixed(2)}
                </span>
              </p>
            ) : null}
            <p className="mt-2 text-[10px] text-neutral-500">
              This run ·{" "}
              <span className="font-mono font-semibold text-neutral-800">
                {snapshotPromptTokens + snapshotCompletionTokens > 0
                  ? `${fmtTokens(snapshotPromptTokens)} prompt + ${fmtTokens(snapshotCompletionTokens)} completion`
                  : "—"}
              </span>{" "}
              tokens
            </p>
          </div>

          {rd ? (
            <div className="rounded-lg border border-neutral-200 border-l-4 border-l-violet-600 bg-white p-3 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-violet-900">
                  Gate 2 · Algorithmic readability (Dim 08 · FK grade)
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${gateBadgeClass(rd.status)}`}
                >
                  {rd.status}
                </span>
              </div>
              <p className="mb-2 text-sm text-neutral-800">
                <span className="inline-flex items-center gap-1.5">
                  {overallEmoji(rd.status)}
                  <span>
                    Score{" "}
                    <span className="font-mono font-semibold">
                      {rd.score !== null && rd.score !== undefined
                        ? rd.score.toFixed(2)
                        : "—"}
                    </span>
                  </span>
                </span>
              </p>
              <p className="mb-2 text-[10px] font-semibold uppercase text-neutral-500">
                Engine
              </p>
              <p className="font-mono text-xs text-neutral-800">
                Python textstat (Flesch–Kincaid, deterministic)
              </p>
              <p className="mb-2 mt-2 text-[10px] font-semibold uppercase text-neutral-500">
                Reasoning
              </p>
              <p className="text-sm leading-relaxed text-neutral-800">
                {rd.reasoning}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/* 3 · Immutable audit trail */}
      <section
        className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 p-4"
        aria-labelledby="trace-audit-heading"
      >
        <div className="flex items-center gap-2 border-b border-neutral-200/80 pb-2">
          <span className="text-lg" aria-hidden>
            📜
          </span>
          <h4
            id="trace-audit-heading"
            className="text-[11px] font-bold uppercase tracking-widest text-neutral-600"
          >
            Immutable audit trail (merged)
          </h4>
        </div>
        <blockquote className="mt-3 border-l-4 border-neutral-400 bg-white/90 py-2 pl-3 pr-2 text-sm italic leading-relaxed text-neutral-700 shadow-sm">
          <span className="font-semibold not-italic text-neutral-900">
            [system log]
          </span>{" "}
          {auditSummary}
        </blockquote>
        <div className="mt-3 rounded-lg border border-neutral-200 bg-white p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            Full merged reasoning
          </p>
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-neutral-800">
            {data.reasoning?.trim() ? data.reasoning : "—"}
          </pre>
        </div>
      </section>

      {/* 4 · Telemetry */}
      <section
        className="rounded-xl border border-neutral-200 bg-slate-50 p-4 shadow-sm"
        aria-labelledby="trace-tel-heading"
      >
        <div className="flex items-center gap-2 border-b border-neutral-200/80 pb-2">
          <span className="text-lg" aria-hidden>
            📊
          </span>
          <h4
            id="trace-tel-heading"
            className="text-[11px] font-bold uppercase tracking-widest text-neutral-600"
          >
            Telemetry &amp; cost
          </h4>
          <span className="ml-auto font-mono text-[10px] text-neutral-500">
            per {runCount} run batch
          </span>
        </div>
        <ul className="mt-3 space-y-2 text-sm text-neutral-800">
          <li className="flex flex-wrap justify-between gap-2 border-b border-neutral-200/60 pb-2">
            <span className="text-neutral-600">Primary model</span>
            <code className="font-mono text-xs font-semibold">{primaryModel}</code>
          </li>
          <li className="flex flex-wrap justify-between gap-2 border-b border-neutral-200/60 pb-2">
            <span className="text-neutral-600">Snapshot run tokens</span>
            <span className="font-mono text-xs">
              {fmtTokens(snapshotPromptTokens)} prompt +{" "}
              {fmtTokens(snapshotCompletionTokens)} completion
            </span>
          </li>
          <li className="flex flex-wrap justify-between gap-2 border-b border-neutral-200/60 pb-2">
            <span className="text-neutral-600">Cumulative ({runCount} runs)</span>
            <span className="font-mono text-xs font-semibold">
              {fmtTokens(totalPromptTokens)} prompt +{" "}
              {fmtTokens(totalCompletionTokens)} completion
            </span>
          </li>
          <li className="flex flex-wrap justify-between gap-2 pt-1">
            <span className="text-neutral-600">
              Algorithmic compute (Gate 2)
            </span>
            <span className="font-mono text-xs text-emerald-800">
              $0.00 · 0 LLM tokens
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
