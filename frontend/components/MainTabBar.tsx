import type { MainTab } from "@/lib/types";

const TABS: { id: MainTab; label: string }[] = [
  { id: "evaluation", label: "Evaluation" },
  { id: "promptEngineering", label: "Prompt Engineering" },
  { id: "antiPatterns", label: "Anti-Pattern DB" },
];

type Props = {
  mainTab: MainTab;
  onChange: (tab: MainTab) => void;
};

export function MainTabBar({ mainTab, onChange }: Props) {
  return (
    <nav
      className="mb-6 flex flex-wrap gap-1 border-b border-neutral-200"
      aria-label="Demo sections"
    >
      {TABS.map((t) => {
        const active = mainTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
