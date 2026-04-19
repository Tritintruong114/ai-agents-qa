import { ApiDocsLinks } from "@/components/ApiDocsLinks";
import type { AppMode } from "@/lib/types";

type Props = {
  appMode: AppMode;
  onAppModeChange: (mode: AppMode) => void;
};

export function GlobalAppHeader({ appMode, onAppModeChange }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-[1920px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-neutral-900 sm:text-base">
            LeapXpert KSL PoC
          </span>
          <ApiDocsLinks />
        </div>

        <div className="flex shrink-0 gap-2 lg:pt-0.5">
          <button
            type="button"
            onClick={() => onAppModeChange("presentation")}
            className={`rounded border px-3 py-1.5 text-xs font-medium sm:text-sm ${
              appMode === "presentation"
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
            }`}
          >
            Pitch Deck
          </button>
          <button
            type="button"
            onClick={() => onAppModeChange("demo")}
            className={`rounded border px-3 py-1.5 text-xs font-medium sm:text-sm ${
              appMode === "demo"
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
            }`}
          >
            Live Demo
          </button>
        </div>
      </div>
    </header>
  );
}
