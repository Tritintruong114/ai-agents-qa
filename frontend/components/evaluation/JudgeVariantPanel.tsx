import {
  evaluationLogToPayload,
  resolvedSnapshotIndex,
} from "@/lib/evaluation-helpers";
import type { EvaluatePayload, VariantState } from "@/lib/types";
import type { TestCase } from "@/lib/constants";
import { EvaluationTraceDashboard } from "./EvaluationTraceDashboard";
import { StabilityDots } from "./StabilityDots";

type Props = {
  label: string;
  testCase: TestCase;
  state: VariantState;
  runCount: number;
  onTemperatureChange: (t: number) => void;
  onRun: () => void;
  onSelectSnapshotRun?: (runIndex: number) => void;
};

export function JudgeVariantPanel({
  label,
  testCase,
  state,
  runCount,
  onTemperatureChange,
  onRun,
  onSelectSnapshotRun,
}: Props) {
  const busy = state.loading;
  const n = Math.max(runCount, 1);
  const passCount = state.runsHistory.filter(
    (x) =>
      x !== null &&
      String(x.compliance_status).trim().toUpperCase() === "PASS",
  ).length;
  const stabilityPct =
    state.progress >= n && !busy && !state.error
      ? Math.round((passCount / n) * 100)
      : null;

  const snapshotDone =
    !busy && !state.error && state.progress >= n && state.runsHistory.length >= n;
  const snapIdx = snapshotDone ? resolvedSnapshotIndex(state) : n - 1;
  const snapLog = snapshotDone ? state.runsHistory[snapIdx] : null;
  const snapshotEval: EvaluatePayload | null = snapLog
    ? evaluationLogToPayload(snapLog)
    : state.evaluationResult;

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-neutral-200 bg-neutral-50/80">
      <div className="border-b border-neutral-200 bg-white/90 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-black">{label}</h3>
          <button
            type="button"
            onClick={onRun}
            disabled={busy}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#0066ff] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0052cc] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 sm:px-4 sm:text-sm"
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <span
                  className="inline-block size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden
                />
                Evaluating {state.progress}/{n}…
              </span>
            ) : (
              `Run ${n}x Stability Test`
            )}
          </button>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between gap-2 text-xs text-neutral-600">
            <span>Temperature (0–1)</span>
            <span className="font-mono font-semibold text-black">
              Temp: {state.temperature.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={state.temperature}
            disabled={busy}
            onChange={(e) => onTemperatureChange(Number(e.target.value))}
            className="mt-2 h-2 w-full cursor-pointer accent-[#0066ff] disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {busy && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] text-neutral-600">
              <span>Progress</span>
              <span>
                {state.progress}/{n}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full bg-[#0066ff] transition-[width] duration-300"
                style={{
                  width: `${(state.progress / n) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="mt-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
            Stability ({n} runs)
          </p>
          <div className="mt-1.5">
            <StabilityDots
              history={state.runsHistory}
              runCount={n}
              onSelectRunIndex={onSelectSnapshotRun}
              activeIndex={snapIdx}
              highlightActive={snapshotDone}
            />
          </div>
          {stabilityPct !== null && (
            <p className="mt-2 text-xs font-medium text-neutral-800">
              Stability: {stabilityPct}% ({passCount}/{n} PASS)
            </p>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        {busy && state.progress === n && (
          <div
            className="rounded-lg border border-neutral-200 bg-white p-3"
            role="status"
            aria-live="polite"
          >
            <p className="text-xs font-medium text-[#0066ff]">
              Run {n}/{n} — streaming reasoning (last run only)
            </p>
            <div className="mt-2 min-h-[3rem] rounded border border-dashed border-neutral-200 bg-neutral-50/50 p-2 font-mono text-sm leading-relaxed text-neutral-900">
              {state.streamReasoning ? (
                <>
                  <span className="whitespace-pre-wrap">
                    {state.streamReasoning}
                  </span>
                  <span
                    className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[#0066ff]"
                    aria-hidden
                  />
                </>
              ) : (
                <span className="text-neutral-400">Waiting for tokens…</span>
              )}
            </div>
          </div>
        )}

        {state.error && !busy && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
            role="alert"
          >
            <p className="font-semibold">Error</p>
            <p className="mt-1 text-xs text-red-800">{state.error}</p>
          </div>
        )}

        {snapshotEval && snapshotDone && (
          <EvaluationTraceDashboard
            testCase={testCase}
            runIndex1Based={snapIdx + 1}
            runCount={n}
            temperature={state.temperature}
            stabilityPct={stabilityPct}
            passCount={passCount}
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
        )}
      </div>

      {!(snapshotEval && snapshotDone) ? (
        <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-2.5 text-[11px] text-neutral-700">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              🤖 Model:{" "}
              <span className="font-mono font-semibold text-black">
                {state.evalMeta?.model_name ?? "—"}
              </span>
            </span>
            <span>
              🪙 Tokens ({n} runs total):{" "}
              <span className="font-mono font-semibold text-black">
                {state.totalTokens.prompt + state.totalTokens.completion > 0
                  ? `${state.totalTokens.prompt} prompt + ${state.totalTokens.completion} completion`
                  : "—"}
              </span>
            </span>
          </div>
          {busy ? (
            <p className="mt-1 text-[#0066ff]">Sequential SSE (no overlap)…</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
