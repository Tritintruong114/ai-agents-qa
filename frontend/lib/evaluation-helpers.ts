import { DEFAULT_OPENAI_MODEL } from "./constants";
import type {
  ComplianceStatus,
  EvaluateApiSuccess,
  EvaluatePayload,
  EvaluationLog,
  RunSlot,
  VariantState,
} from "./types";

export function evaluationFromApiBody(
  body: EvaluateApiSuccess | null,
): EvaluatePayload | null {
  if (!body) return null;
  const nested = body.evaluation;
  if (nested && typeof nested === "object") {
    return { ...nested };
  }
  return {
    is_ui_description: body.is_ui_description,
    reasoning: body.reasoning,
    evidence_quote:
      typeof body.evidence_quote === "string" ? body.evidence_quote : undefined,
    compliance_status: body.compliance_status,
    confidence_score:
      typeof body.confidence_score === "number"
        ? body.confidence_score
        : undefined,
    routing_decision:
      typeof body.routing_decision === "string"
        ? body.routing_decision
        : undefined,
    is_shadow_mode:
      typeof body.is_shadow_mode === "boolean"
        ? body.is_shadow_mode
        : undefined,
    llm_reasoning:
      typeof body.llm_reasoning === "string" ? body.llm_reasoning : undefined,
    llm_compliance_status:
      typeof body.llm_compliance_status === "string"
        ? body.llm_compliance_status
        : undefined,
    readability_dimension: _parseReadability(body.readability_dimension),
    circuit_breaker: body.circuit_breaker,
    error: body.error,
    detail: body.detail,
  };
}

function _parseReadability(
  raw: unknown,
): import("./types").ReadabilityDimension | undefined {
  if (raw === null || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.reasoning !== "string" || typeof o.status !== "string") {
    return undefined;
  }
  return {
    dimension: typeof o.dimension === "string" ? o.dimension : "Readability",
    status: o.status,
    score: typeof o.score === "number" ? o.score : null,
    reasoning: o.reasoning,
  };
}

export function normalizeStatus(value: unknown): ComplianceStatus | null {
  if (typeof value !== "string") return null;
  const u = value.trim().toUpperCase();
  if (u === "PASS" || u === "WARNING" || u === "FAIL") return u;
  return value;
}

export function createInitialVariant(
  runCount: number,
  openaiModel: string = DEFAULT_OPENAI_MODEL,
): VariantState {
  const n = Math.max(1, runCount);
  return {
    openaiModel,
    temperature: 0,
    loading: false,
    evaluationResult: null,
    streamReasoning: "",
    evalMeta: null,
    error: null,
    runsHistory: Array.from({ length: n }, () => null),
    snapshotRunIndex: null,
    progress: 0,
    totalTokens: { prompt: 0, completion: 0 },
  };
}

/**
 * Index of the run to show in the trace panel. Honors explicit
 * `snapshotRunIndex` when set; otherwise the last *completed* slot
 * (so in-progress batches default to the newest finished run, not an empty last slot).
 */
export function resolvedSnapshotIndex(state: VariantState): number {
  const n = state.runsHistory.length;
  if (n === 0) return 0;
  if (state.snapshotRunIndex !== null) {
    return Math.min(Math.max(0, state.snapshotRunIndex), n - 1);
  }
  for (let i = n - 1; i >= 0; i--) {
    if (state.runsHistory[i] !== null) {
      return i;
    }
  }
  return 0;
}

export function evaluationLogToPayload(log: EvaluationLog): EvaluatePayload {
  return {
    is_ui_description: log.is_ui_description,
    compliance_status: log.compliance_status,
    reasoning: log.reasoning,
    evidence_quote: log.evidence_quote ?? undefined,
    confidence_score: log.confidence_score ?? undefined,
    routing_decision: log.routing_decision ?? undefined,
    llm_reasoning: log.llm_reasoning ?? undefined,
    llm_compliance_status: log.llm_compliance_status ?? undefined,
    readability_dimension: log.readability_dimension ?? undefined,
  };
}

export function isAllPassRuns(history: RunSlot[]): boolean {
  if (history.length === 0) return false;
  return history.every(
    (x) =>
      x !== null &&
      String(x.compliance_status).trim().toUpperCase() === "PASS",
  );
}

/** Each run’s merged compliance_status must match the golden case’s expected verdict. */
export function isAllRunsMatchExpected(
  history: RunSlot[],
  expected: string,
): boolean {
  if (history.length === 0) return false;
  const exp = expected.trim().toUpperCase();
  return history.every(
    (x) =>
      x !== null &&
      String(x.compliance_status).trim().toUpperCase() === exp,
  );
}

/** Per-run counts vs golden; non-matching runs bucketed by actual verdict. */
export type StabilityVerdictBreakdown = {
  matchCount: number;
  warnCount: number;
  failCount: number;
  otherCount: number;
};

export function stabilityVerdictBreakdown(
  history: RunSlot[],
  expectedVerdict: string,
): StabilityVerdictBreakdown {
  const exp = expectedVerdict.trim().toUpperCase();
  let matchCount = 0;
  let warnCount = 0;
  let failCount = 0;
  let otherCount = 0;
  for (const slot of history) {
    if (slot === null) continue;
    const s = String(slot.compliance_status).trim().toUpperCase();
    if (s === exp) {
      matchCount++;
      continue;
    }
    if (s === "WARNING") warnCount++;
    else if (s === "FAIL") failCount++;
    else otherCount++;
  }
  return { matchCount, warnCount, failCount, otherCount };
}

/** Emoji for aggregate stability: FAIL dominates, then WARNING/other, then full match. */
export function stabilityAggregateEmoji(b: StabilityVerdictBreakdown): string {
  if (b.failCount > 0) return "🔴";
  if (b.warnCount > 0 || b.otherCount > 0) return "🟡";
  return "🟢";
}

/** Human-readable remainder line (WARN / FAIL / other %) for completed batches. */
export function formatStabilityRemainderLine(
  runCount: number,
  b: StabilityVerdictBreakdown,
): string {
  const n = Math.max(runCount, 1);
  const rest = b.warnCount + b.failCount + b.otherCount;
  if (rest === 0) return "";
  const parts: string[] = [];
  if (b.warnCount > 0) {
    parts.push(
      `🟡 ${Math.round((b.warnCount / n) * 100)}% WARNING (${b.warnCount}/${n})`,
    );
  }
  if (b.failCount > 0) {
    parts.push(
      `🔴 ${Math.round((b.failCount / n) * 100)}% FAIL (${b.failCount}/${n})`,
    );
  }
  if (b.otherCount > 0) {
    parts.push(
      `⚪ ${Math.round((b.otherCount / n) * 100)}% other (${b.otherCount}/${n})`,
    );
  }
  return parts.join(" · ");
}

export function heatmapDotClasses(runCount: number): {
  container: string;
  dot: string;
  ringOffset: string;
  hoverScale: string;
} {
  if (runCount <= 10) {
    return {
      container:
        "flex flex-wrap gap-1 overflow-y-auto max-h-48 p-2 bg-gray-900 rounded",
      dot: "inline-block w-6 h-6 min-w-6 min-h-6 shrink-0 rounded-sm",
      ringOffset: "ring-offset-gray-900",
      hoverScale: "hover:scale-125 hover:shadow-md",
    };
  }
  if (runCount <= 100) {
    return {
      container:
        "flex flex-wrap gap-0.5 overflow-y-auto max-h-48 p-2 bg-gray-900 rounded",
      dot: "inline-block w-3 h-3 min-w-3 min-h-3 shrink-0 rounded-sm",
      ringOffset: "ring-offset-gray-900",
      hoverScale: "hover:scale-110 hover:shadow",
    };
  }
  return {
    container:
      "flex flex-wrap gap-0 overflow-y-auto max-h-48 p-2 bg-gray-900 rounded",
    dot: "inline-block w-1.5 h-1.5 min-w-[6px] min-h-[6px] shrink-0 rounded-sm",
    ringOffset: "ring-offset-gray-900",
    hoverScale: "hover:brightness-110",
  };
}

export function formatAntiPatternDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
