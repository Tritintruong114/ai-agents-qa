import { TEST_CASES } from "@/lib/constants";
import { OldVerdictBadge } from "@/components/evaluation/Badges";

type Props = {
  selectedId: string;
  onSelectId: (id: string) => void;
};

export function GoldenDatasetSidebar({ selectedId, onSelectId }: Props) {
  return (
    <aside className="flex min-h-0 min-w-0 flex-col border-b border-neutral-200 bg-neutral-50 lg:border-b-0 lg:border-r">
      <div className="border-b border-neutral-200 px-2.5 py-2">
        <h2 className="text-xs font-semibold leading-tight text-black">
          <span className="block">Golden Dataset</span>
          <span className="mt-0.5 block text-[10px] font-normal text-neutral-500">
            Evaluation harness · SEC 17a-4
          </span>
        </h2>
        <p className="mt-1 text-[10px] text-neutral-500">6 scenarios</p>
      </div>
      <nav className="max-h-[50vh] flex-1 overflow-y-auto p-1.5 lg:max-h-none">
        <ul className="space-y-1.5">
          {TEST_CASES.map((tc) => {
            const active = tc.id === selectedId;
            return (
              <li key={tc.id}>
                <button
                  type="button"
                  onClick={() => onSelectId(tc.id)}
                  className={`w-full min-w-0 rounded-md border px-2 py-2 text-left transition ${
                    active
                      ? "border-[#0066ff]/40 bg-[#0066ff]/8 shadow-[0_0_0_1px_rgba(0,102,255,0.15)]"
                      : "border-transparent bg-white/80 hover:border-neutral-200 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="shrink-0 text-[10px] font-mono text-neutral-500">
                      #{tc.id}
                    </span>
                    <OldVerdictBadge verdict={tc.oldAgentVerdict} />
                  </div>
                  <span className="mt-1 block min-w-0 break-words text-xs font-medium leading-snug text-black">
                    {tc.title}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-tight text-neutral-500">
                    {tc.secGroup}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
