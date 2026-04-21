import type { Dispatch, SetStateAction } from "react";
import { JudgeVariantPanel } from "@/components/evaluation/JudgeVariantPanel";
import type { TestCase } from "@/lib/constants";
import type { VariantState } from "@/lib/types";

function expectedOutcomeBoxClass(verdict: TestCase["expectedVerdict"]): string {
  switch (verdict) {
    case "PASS":
      return "border-emerald-200 bg-emerald-50/90 text-emerald-950";
    case "WARNING":
      return "border-amber-200 bg-amber-50/90 text-amber-950";
    case "FAIL":
      return "border-red-200 bg-red-50/90 text-red-950";
    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-900";
  }
}

type Props = {
  selected: TestCase;
  abTestingMode: boolean;
  stabilityRunCount: number;
  variantA: VariantState;
  variantB: VariantState;
  setVariantA: Dispatch<SetStateAction<VariantState>>;
  setVariantB: Dispatch<SetStateAction<VariantState>>;
  onRunA: () => void;
  onRunB: () => void;
};

export function EvaluationTab({
  selected,
  abTestingMode,
  stabilityRunCount,
  variantA,
  variantB,
  setVariantA,
  setVariantB,
  onRunA,
  onRunB,
}: Props) {
  return (
    <>
      <div className="mb-5 border-b border-neutral-100 pb-5">
        <p className="text-xs font-mono uppercase tracking-wide text-neutral-500">
          CASE-{selected.id} · {selected.secGroup}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-black sm:text-4xl">
          {selected.title}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-neutral-700">
          {selected.summary}
        </p>
        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Steps
            </h3>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-neutral-800">
              {selected.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Expected
            </h3>
            <p
              className={`mt-2 rounded-lg border p-3 text-sm leading-relaxed ${expectedOutcomeBoxClass(selected.expectedVerdict)}`}
            >
              <span className="font-semibold">{selected.expectedVerdict}</span>
              {selected.expected.slice(selected.expectedVerdict.length)}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              PRD context (sent to judge as &lt;PRD_CONTEXT&gt;)
            </h3>
            <p className="mt-2 whitespace-pre-wrap rounded-lg border border-violet-200/80 bg-violet-50/50 p-3 text-sm leading-relaxed text-neutral-900">
              {selected.prdContext}
            </p>
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Documentation draft (sent as &lt;DRAFT&gt;)
            </h3>
            <p className="mt-2 whitespace-pre-wrap rounded-lg border border-sky-200/80 bg-sky-50/50 p-3 text-sm leading-relaxed text-neutral-900">
              {selected.draftText}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50/80 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-black">
            <span aria-hidden>💡 </span>
            The Architecture Contrast
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-red-200/90 bg-white p-3 sm:p-4">
              <p className="text-sm font-semibold text-red-950">
                <span aria-hidden>❌ </span>
                {selected.architectureContrast.oldHeading}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-800">
                {selected.architectureContrast.oldBody}
              </p>
            </div>
            <div className="rounded-md border border-[#0066ff]/25 bg-white p-3 sm:p-4">
              <p className="text-sm font-semibold text-black">
                <span aria-hidden>✅ </span>
                {selected.architectureContrast.newHeading}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-800">
                {selected.architectureContrast.newBody}
              </p>
            </div>
          </div>
        </div>
      </div>

      {!abTestingMode ? (
        <JudgeVariantPanel
          label="Variant A"
          testCase={selected}
          state={variantA}
          runCount={stabilityRunCount}
          onTemperatureChange={(t) =>
            setVariantA((s) => ({ ...s, temperature: t }))
          }
          onOpenaiModelChange={(m) =>
            setVariantA((s) => ({ ...s, openaiModel: m }))
          }
          onRun={onRunA}
          onSelectSnapshotRun={(runIndex) =>
            setVariantA((s) => ({ ...s, snapshotRunIndex: runIndex }))
          }
        />
      ) : (
        <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
          <JudgeVariantPanel
            label="Variant A"
            testCase={selected}
            state={variantA}
            runCount={stabilityRunCount}
            onTemperatureChange={(t) =>
              setVariantA((s) => ({ ...s, temperature: t }))
            }
            onOpenaiModelChange={(m) =>
              setVariantA((s) => ({ ...s, openaiModel: m }))
            }
            onRun={onRunA}
            onSelectSnapshotRun={(runIndex) =>
              setVariantA((s) => ({ ...s, snapshotRunIndex: runIndex }))
            }
          />
          <JudgeVariantPanel
            label="Variant B"
            testCase={selected}
            state={variantB}
            runCount={stabilityRunCount}
            onTemperatureChange={(t) =>
              setVariantB((s) => ({ ...s, temperature: t }))
            }
            onOpenaiModelChange={(m) =>
              setVariantB((s) => ({ ...s, openaiModel: m }))
            }
            onRun={onRunB}
            onSelectSnapshotRun={(runIndex) =>
              setVariantB((s) => ({ ...s, snapshotRunIndex: runIndex }))
            }
          />
        </div>
      )}
    </>
  );
}
