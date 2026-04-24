"use client";

import { useEffect, useId, useState } from "react";
import { EvaluationTraceDashboard } from "./EvaluationTraceDashboard";
import { StabilityDots } from "./StabilityDots";
import { TEST_CASES } from "@/lib/constants";
import {
  evaluationLogToPayload,
  formatStabilityRemainderLine,
  resolvedSnapshotIndex,
  stabilityAggregateEmoji,
  stabilityVerdictBreakdown,
} from "@/lib/evaluation-helpers";
import type { CompletedStabilityRunRecord, EvaluatePayload } from "@/lib/types";

type Props = {
  open: boolean;
  record: CompletedStabilityRunRecord | null;
  onClose: () => void;
};

export function CompletedStabilityRunModal({ open, record, onClose }: Props) {
  const titleId = useId();
  const [selectedRunIdx, setSelectedRunIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !record) return;
    const s = record.variantSnapshot;
    setSelectedRunIdx(resolvedSnapshotIndex(s));
  }, [open, record?.id]);

  if (!open || !record) return null;

  const testCase = TEST_CASES.find((c) => c.id === record.testCaseId);
  const state = record.variantSnapshot;
  const n = Math.max(record.stabilityRunCount, 1);
  const golden = testCase?.expectedVerdict ?? "PASS";
  const goldenMatchCount = state.runsHistory.filter(
    (x) =>
      x !== null &&
      String(x.compliance_status).trim().toUpperCase() === golden,
  ).length;
  const verdictBreakdown = stabilityVerdictBreakdown(state.runsHistory, golden);
  const stabilityRemainderLine = formatStabilityRemainderLine(n, verdictBreakdown);
  const stabilityPct =
    state.progress >= n && !state.loading && !state.error
      ? Math.round((goldenMatchCount / n) * 100)
      : null;
  const snapIdx = Math.min(Math.max(0, selectedRunIdx), n - 1);
  const snapLog = state.runsHistory[snapIdx] ?? null;
  const snapshotEval: EvaluatePayload | null = snapLog
    ? evaluationLogToPayload(snapLog)
    : state.evaluationResult;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[min(92dvh,900px)] w-full max-w-3xl flex-col rounded-t-xl border border-neutral-200 bg-white shadow-xl sm:rounded-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-start justify-between gap-2 border-b border-neutral-100 px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-sm font-semibold text-black">
              Saved batch · Variant {record.which.toUpperCase()}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-600">
              {n} stability run{n !== 1 ? "s" : ""} — viewing run {snapIdx + 1}/{n}
            </p>
            <p className="mt-0.5 truncate text-xs text-neutral-600">
              CASE-{record.testCaseId} · {record.testCaseTitle}
            </p>
            <p className="mt-1 text-[10px] text-neutral-500">
              Outcome:{" "}
              <span className="font-semibold text-neutral-800">{record.outcome}</span>
              {record.outcome === "completed" ? null : (
                <span className="text-neutral-500">
                  {" "}
                  — trace reflects the last finished step when available.
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
          >
            Close
          </button>
        </div>

        <div className="border-b border-neutral-100 bg-neutral-50/80 px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            Jump to run
          </p>
          <div className="mt-1.5">
            <StabilityDots
              history={state.runsHistory}
              runCount={n}
              onSelectRunIndex={setSelectedRunIdx}
              activeIndex={snapIdx}
              highlightActive={state.runsHistory[snapIdx] !== null}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {!testCase ? (
            <p className="text-sm text-neutral-600">Test case not found in dataset.</p>
          ) : snapshotEval ? (
            <>
              {stabilityPct !== null && (
                <p className="mb-3 text-xs font-medium text-neutral-800">
                  <span className="mr-1" aria-hidden>
                    {stabilityAggregateEmoji(verdictBreakdown)}
                  </span>
                  Stability: {stabilityPct}% ({goldenMatchCount}/{n} match {golden})
                  {stabilityRemainderLine ? (
                    <span className="font-normal text-neutral-600">
                      {" "}
                      · {stabilityRemainderLine}
                    </span>
                  ) : null}
                </p>
              )}
              <EvaluationTraceDashboard
                key={snapIdx}
                testCase={testCase}
                runIndex1Based={snapIdx + 1}
                runCount={n}
                temperature={state.temperature}
                stabilityPct={stabilityPct}
                goldenMatchCount={goldenMatchCount}
                stabilityBreakdown={verdictBreakdown}
                data={snapshotEval}
                snapshotPromptTokens={snapLog?.prompt_tokens ?? 0}
                snapshotCompletionTokens={snapLog?.completion_tokens ?? 0}
                totalPromptTokens={state.totalTokens.prompt}
                totalCompletionTokens={state.totalTokens.completion}
                modelLabel={
                  state.evalMeta?.model_name
                    ? `${state.evalMeta.model_name}`
                    : undefined
                }
              />
            </>
          ) : (
            <p className="text-sm text-neutral-600">
              No evaluation snapshot available for this run.
            </p>
          )}
          {state.error ? (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-900">
              {state.error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
