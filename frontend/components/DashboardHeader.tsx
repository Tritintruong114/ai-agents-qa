import { STABILITY_RUN_OPTIONS } from "@/lib/constants";

type Props = {
  stabilityRunCount: number;
  onStabilityRunCountChange: (n: number) => void;
  abTestingMode: boolean;
  onToggleAbTesting: () => void;
  runsBusy: boolean;
};

export function DashboardHeader({
  stabilityRunCount,
  onStabilityRunCountChange,
  abTestingMode,
  onToggleAbTesting,
  runsBusy,
}: Props) {
  return (
    <header className="border-b border-neutral-200 bg-white px-6 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
            Knowledge Systems Lead · SEC 17a-4
          </p>
          <h1 className="text-xl font-semibold text-black">
            KSL Compliance Dashboard
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            N× stability vs temperature, sequential SSE, cumulative tokens.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
          <label className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-700">
            <span id="test-runs-label">Test Runs:</span>
            <select
              id="test-runs-select"
              aria-labelledby="test-runs-label"
              className="max-w-[5rem] rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066ff] disabled:cursor-not-allowed disabled:opacity-50"
              value={stabilityRunCount}
              disabled={runsBusy}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (
                  STABILITY_RUN_OPTIONS.includes(
                    v as (typeof STABILITY_RUN_OPTIONS)[number],
                  )
                ) {
                  onStabilityRunCountChange(v);
                }
              }}
            >
              {STABILITY_RUN_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          <div className="flex shrink-0 items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
            <span
              id="ab-label"
              className="text-xs font-medium text-neutral-700"
            >
              A/B Testing Mode
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={abTestingMode}
              aria-labelledby="ab-label"
              disabled={runsBusy}
              onClick={onToggleAbTesting}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066ff] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                abTestingMode ? "bg-[#0066ff]" : "bg-neutral-300"
              }`}
            >
              <span
                className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform ${
                  abTestingMode ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
