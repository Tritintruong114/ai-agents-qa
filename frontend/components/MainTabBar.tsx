import type { MainTab } from "@/lib/types";

const TABS: { id: MainTab; label: string }[] = [
  { id: "evaluation", label: "Evaluation" },
  { id: "promptEngineering", label: "Prompt Engineering" },
  { id: "antiPatterns", label: "Anti-Pattern DB" },
  { id: "dataContracts", label: "Data Contracts" },
];

type Props = {
  mainTab: MainTab;
  onChange: (tab: MainTab) => void;
};

export function MainTabBar({ mainTab, onChange }: Props) {
  return (
    <nav
      className="mb-6 flex flex-wrap gap-1.5"
      aria-label="Demo sections"
    >
      {TABS.map((t) => {
        const active = mainTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-[#0066ff] text-white shadow-sm"
                : "bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-black"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
