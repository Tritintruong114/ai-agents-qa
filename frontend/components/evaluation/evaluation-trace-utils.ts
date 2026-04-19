import type { EvaluatePayload, ReadabilityDimension } from "@/lib/types";

export function mergedAlgoSplitIndex(merged: string): number {
  const markers = ["\n\n[Algorithm", "\n\n[Thuật toán"];
  let best = -1;
  for (const m of markers) {
    const j = merged.indexOf(m);
    if (j >= 0 && (best === -1 || j < best)) best = j;
  }
  return best;
}

export function fallbackLlmReasoning(
  merged: string | undefined,
  llm?: string,
): string {
  if (llm?.trim()) return llm.trim();
  if (!merged?.trim()) return "—";
  const idx = mergedAlgoSplitIndex(merged);
  if (idx === -1) {
    return merged.replace(/^\[SEC[^\]]*\]\s*\n?/u, "").trim() || merged;
  }
  return merged
    .slice(0, idx)
    .replace(/^\[SEC[^\]]*\]\s*\n?/u, "")
    .trim();
}

export function gateBadgeClass(status: string): string {
  const s = String(status).toUpperCase();
  if (s === "PASS") return "bg-emerald-600 text-white";
  if (s === "WARNING") return "bg-amber-500 text-white";
  if (s === "FAIL") return "bg-red-600 text-white";
  return "bg-neutral-500 text-white";
}

export function overallEmoji(overall: string | null | undefined): string {
  const u = String(overall ?? "").toUpperCase();
  if (u === "PASS") return "🟢";
  if (u === "WARNING") return "🟡";
  if (u === "FAIL") return "🔴";
  return "⚪";
}

export function buildAuditSummaryLine(
  data: EvaluatePayload,
  overall: string | null,
): string {
  const route = data.routing_decision ?? "—";
  const shadow = data.is_shadow_mode !== false;
  const ui =
    data.is_ui_description === true
      ? "UI-only scope verified"
      : data.is_ui_description === false
        ? "non-UI / backend implications reviewed"
        : "UI scope undetermined";
  const rd: ReadabilityDimension | undefined = data.readability_dimension;
  const fk =
    rd?.score !== null && rd?.score !== undefined
      ? `Readability FK grade ${Number(rd.score).toFixed(2)} (${rd.status})`
      : "Readability gate n/a";
  const pipeline = shadow
    ? "Shadow mode: routing logged only; no CI/CD enforcement block."
    : "Enforcement mode: thresholds may block or escalate.";
  return (
    `Draft trace · routing \`${route}\` · overall ${overall ?? "—"}. ` +
    `${ui}. ${fk}. ${pipeline}`
  );
}
