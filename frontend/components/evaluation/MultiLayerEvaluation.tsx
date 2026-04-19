import { ComplianceBadge } from "./Badges";
import {
  fallbackLlmReasoning,
  gateBadgeClass,
} from "./evaluation-trace-utils";
import { normalizeStatus } from "@/lib/evaluation-helpers";
import type { EvaluatePayload, ReadabilityDimension } from "@/lib/types";

/**
 * Compact multi-layer summary (legacy layout).
 * Prefer {@link EvaluationTraceDashboard} for the full audit layout.
 */
type Props = {
  data: EvaluatePayload;
  promptTokens: number;
  completionTokens: number;
  modelLabel?: string;
};

export function MultiLayerEvaluation({
  data,
  promptTokens,
  completionTokens,
  modelLabel,
}: Props) {
  const overall = normalizeStatus(data.compliance_status);
  const llmStatus =
    (data.llm_compliance_status as string | undefined) ??
    String(data.compliance_status ?? "—");
  const rd: ReadabilityDimension | undefined = data.readability_dimension;
  const llmText = fallbackLlmReasoning(data.reasoning, data.llm_reasoning);
  const tokenTotal = promptTokens + completionTokens;

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <h3 className="mb-3 text-base font-semibold text-neutral-900">
        Multi-layer evaluation
      </h3>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 shadow-sm">
        <span className="text-sm font-semibold text-neutral-800">
          Overall verdict (after SEC + Readability merge)
        </span>
        {overall ? (
          <ComplianceBadge status={overall} />
        ) : (
          <span className="text-sm text-neutral-500">—</span>
        )}
      </div>

      <div className="mb-4 rounded-lg border border-neutral-200 border-l-4 border-l-blue-600 bg-white p-3 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-blue-800">
            Gate 1 — Semantic gate (Dim 03 · SEC 17a-4)
          </span>
          <span
            className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${gateBadgeClass(llmStatus)}`}
          >
            {llmStatus}
          </span>
        </div>
        <p className="mb-2 text-xs text-neutral-500">
          Engine:{" "}
          <span className="font-medium text-neutral-700">
            {modelLabel ?? "LLM (Pydantic AI)"}
          </span>{" "}
          · Cost:{" "}
          <span className="font-mono font-semibold text-neutral-800">
            {tokenTotal > 0
              ? `${promptTokens} prompt + ${completionTokens} completion`
              : "—"}
          </span>{" "}
          tokens
        </p>
        {data.confidence_score !== undefined ? (
          <p className="mb-2 text-xs text-neutral-500">
            confidence_score (SEC):{" "}
            <span className="font-mono font-semibold text-neutral-800">
              {data.confidence_score.toFixed(2)}
            </span>
          </p>
        ) : null}
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-800">
          {llmText}
        </p>
      </div>

      {rd ? (
        <div className="rounded-lg border border-neutral-200 border-l-4 border-l-violet-600 bg-white p-3 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-violet-800">
              Gate 2 — Algorithmic gate (Dim 08 · Readability)
            </span>
            <span
              className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${gateBadgeClass(rd.status)}`}
            >
              {rd.status}
            </span>
          </div>
          <p className="mb-2 text-xs text-neutral-500">
            Engine: Python <span className="font-mono">textstat</span> (Flesch–Kincaid) ·
            Cost:{" "}
            <span className="font-semibold text-neutral-800">0 tokens</span> · Score:{" "}
            <span className="font-mono font-bold text-neutral-900">
              {rd.score !== null && rd.score !== undefined
                ? rd.score.toFixed(2)
                : "—"}
            </span>
          </p>
          <p className="text-sm leading-relaxed text-neutral-800">{rd.reasoning}</p>
        </div>
      ) : null}

      {data.routing_decision ? (
        <p className="mt-3 text-xs text-neutral-600">
          Routing (Q8):{" "}
          <span className="font-mono font-semibold text-neutral-900">
            {data.routing_decision}
          </span>
          {data.is_shadow_mode === false ? (
            <span className="text-neutral-500"> · enforcement</span>
          ) : (
            <span className="text-neutral-500"> · shadow (log only)</span>
          )}
        </p>
      ) : null}
    </div>
  );
}
