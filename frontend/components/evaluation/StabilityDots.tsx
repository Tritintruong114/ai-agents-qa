import { heatmapDotClasses } from "@/lib/evaluation-helpers";
import type { RunSlot } from "@/lib/types";

type Props = {
  history: RunSlot[];
  runCount: number;
  onSelectRunIndex?: (index: number) => void;
  activeIndex: number;
  /** Ring the dot for the run whose trace is open (completed slot with data). */
  highlightActive: boolean;
  /** 0-based index of the run currently in flight (null when idle). In-flight shows a pulse. */
  inFlightIndex?: number | null;
};

export function StabilityDots({
  history,
  runCount,
  onSelectRunIndex,
  activeIndex,
  highlightActive,
  inFlightIndex = null,
}: Props) {
  const hm = heatmapDotClasses(runCount);
  return (
    <div className={hm.container} aria-label="Stability heatmap">
      {history.map((h, i) => {
        let bg = "bg-neutral-600";
        if (h) {
          const s = String(h.compliance_status).toUpperCase();
          if (s === "PASS") bg = "bg-emerald-500";
          else if (s === "WARNING") bg = "bg-amber-400";
          else if (s === "FAIL") bg = "bg-red-500";
        }
        const clickable = Boolean(h && onSelectRunIndex);
        const isInFlight = inFlightIndex !== null && i === inFlightIndex && !h;
        const isActive = highlightActive && i === activeIndex;
        const n = Math.max(history.length, 1);
        return (
          <button
            key={i}
            type="button"
            disabled={!clickable}
            title={
              h
                ? `${String(h.compliance_status)} — run ${i + 1}/${n} · click to view trace`
                : isInFlight
                  ? `Run ${i + 1}/${n} — in progress…`
                  : "Not run yet"
            }
            onClick={() => {
              if (!h) return;
              onSelectRunIndex?.(i);
            }}
            className={`${hm.dot} border ${isActive ? `border-[#0066ff] ring-2 ring-[#0066ff]/50 ring-offset-1 ${hm.ringOffset}` : isInFlight ? `border-amber-300 ring-2 ring-amber-400/70 ring-offset-1 ${hm.ringOffset} animate-pulse` : "border-transparent"} ${bg} ${
              clickable
                ? `cursor-pointer shadow-sm transition ${hm.hoverScale} focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066ff] focus-visible:ring-offset-1 ${hm.ringOffset}`
                : isInFlight
                  ? `cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-1 ${hm.ringOffset}`
                : "cursor-default opacity-70"
            }`}
          />
        );
      })}
    </div>
  );
}
