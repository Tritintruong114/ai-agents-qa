import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { JudgeVariantPanel } from "@/components/evaluation/JudgeVariantPanel";
import type { TestCase } from "@/lib/constants";
import { saveTestCaseGoldenContent } from "@/lib/test-case-api";
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

type EditableGoldenFieldProps = {
  field: "prd" | "draft";
  caseId: string;
  heading: string;
  boxClassName: string;
  value: string;
  siblingValue: string;
  contentLoading: boolean;
  onSaved: (prd_context: string, text_chunk: string) => void;
};

function EditableGoldenField({
  field,
  caseId,
  heading,
  boxClassName,
  value,
  siblingValue,
  contentLoading,
  onSaved,
}: EditableGoldenFieldProps) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setLocal(value);
  }, [value, editing]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const prd_context = field === "prd" ? local : siblingValue;
      const text_chunk = field === "draft" ? local : siblingValue;
      const data = await saveTestCaseGoldenContent(caseId, {
        prd_context,
        text_chunk,
      });
      onSaved(data.prd_context, data.text_chunk);
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          {heading}
        </h3>
        {!editing ? (
          <button
            type="button"
            disabled={contentLoading}
            onClick={() => {
              setLocal(value);
              setError(null);
              setEditing(true);
            }}
            className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-800 shadow-sm hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Edit
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="rounded-md bg-[#0066ff] px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-[#0052cc] disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setEditing(false);
                setLocal(value);
                setError(null);
              }}
              className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {editing ? (
        <textarea
          className={`mt-2 min-h-[8rem] w-full resize-y rounded-lg border p-3 font-mono text-sm leading-relaxed text-neutral-900 ${boxClassName}`}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          spellCheck={false}
          aria-label={heading}
        />
      ) : (
        <p
          className={`mt-2 whitespace-pre-wrap rounded-lg border p-3 text-sm leading-relaxed text-neutral-900 ${boxClassName}`}
        >
          {value}
        </p>
      )}
    </div>
  );
}

type Props = {
  selected: TestCase;
  goldenContentLoading?: boolean;
  goldenContentFetchError?: string | null;
  onGoldenContentSaved: (prd_context: string, text_chunk: string) => void;
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
  goldenContentLoading = false,
  goldenContentFetchError = null,
  onGoldenContentSaved,
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
          {goldenContentFetchError ? (
            <p className="text-sm text-red-600" role="alert">
              Could not refresh PRD/draft from API: {goldenContentFetchError}
            </p>
          ) : null}
          {goldenContentLoading ? (
            <p className="text-xs text-neutral-500">Syncing PRD and draft from server…</p>
          ) : null}
          <EditableGoldenField
            field="prd"
            caseId={selected.id}
            heading={
              "PRD context (sent to judge as <PRD_CONTEXT>)"
            }
            boxClassName="border-violet-200/80 bg-violet-50/50"
            value={selected.prdContext}
            siblingValue={selected.draftText}
            contentLoading={goldenContentLoading}
            onSaved={onGoldenContentSaved}
          />
          <EditableGoldenField
            field="draft"
            caseId={selected.id}
            heading={"Documentation draft (sent as <DRAFT>)"}
            boxClassName="border-sky-200/80 bg-sky-50/50"
            value={selected.draftText}
            siblingValue={selected.prdContext}
            contentLoading={goldenContentLoading}
            onSaved={onGoldenContentSaved}
          />
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
          which="a"
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
            which="a"
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
            which="b"
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
