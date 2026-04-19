import type { Dispatch, SetStateAction } from "react";
import { JudgeVariantPanel } from "@/components/evaluation/JudgeVariantPanel";
import type { TestCase } from "@/lib/constants";
import type { VariantState } from "@/lib/types";

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
        <p className="text-[11px] font-mono uppercase tracking-wide text-neutral-500">
          CASE-{selected.id} · {selected.secGroup}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-black">
          {selected.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-700">
          {selected.summary}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
            <p className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-black">
              {selected.expected}
            </p>
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
