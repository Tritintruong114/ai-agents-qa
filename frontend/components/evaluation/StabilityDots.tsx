import { heatmapDotClasses } from "@/lib/evaluation-helpers";
import type { RunSlot } from "@/lib/types";

type Props = {
  history: RunSlot[];
  runCount: number;
  onSelectRunIndex?: (index: number) => void;
  activeIndex: number;
  highlightActive: boolean;
};

export function StabilityDots({
  history,
  runCount,
  onSelectRunIndex,
  activeIndex,
  highlightActive,
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
        const isActive = highlightActive && i === activeIndex;
        const n = Math.max(history.length, 1);
        return (
          <button
            key={i}
            type="button"
            disabled={!clickable}
            title={
              h
                ? `${String(h.compliance_status)} — run ${i + 1}/${n} snapshot (below)`
                : "Not run"
            }
            onClick={() => {
              if (!h) return;
              onSelectRunIndex?.(i);
            }}
            className={`${hm.dot} border ${isActive ? `border-[#0066ff] ring-2 ring-[#0066ff]/50 ring-offset-1 ${hm.ringOffset}` : "border-transparent"} ${bg} ${
              clickable
                ? `cursor-pointer shadow-sm transition ${hm.hoverScale} focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066ff] focus-visible:ring-offset-1 ${hm.ringOffset}`
                : "cursor-default opacity-70"
            }`}
          />
        );
      })}
    </div>
  );
}
