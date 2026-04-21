import { ApiDocsLinksOneLine } from "@/components/ApiDocsLinks";
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
    <header className="border-b border-neutral-200 bg-white px-4 py-2 sm:px-6">
      <div className="flex min-h-8 flex-nowrap items-center justify-between gap-2 overflow-x-auto">
        <ApiDocsLinksOneLine />
        <div className="flex shrink-0 items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-[10px] font-medium text-neutral-700 sm:text-[11px]">
            <span id="test-runs-label">Runs</span>
            <select
              id="test-runs-select"
              aria-labelledby="test-runs-label"
              title="Stability test run count"
              className="max-w-[3.5rem] rounded border border-neutral-300 bg-white px-1 py-0.5 font-mono text-[10px] text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066ff] disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-[4rem] sm:text-[11px]"
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
          <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1">
            <span className="text-[10px] font-medium text-neutral-700 sm:text-[11px]">
              A/B
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={abTestingMode}
              aria-label="A/B testing mode"
              title="A/B testing mode"
              disabled={runsBusy}
              onClick={onToggleAbTesting}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066ff] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                abTestingMode ? "bg-[#0066ff]" : "bg-neutral-300"
              }`}
            >
              <span
                className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
                  abTestingMode ? "left-4" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
