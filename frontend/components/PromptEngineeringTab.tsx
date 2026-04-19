import { API_BASE } from "@/lib/constants";

type Props = {
  systemPrompt: string;
  onSystemPromptChange: (v: string) => void;
  /** Clears saved override and loads default from GET /api/system-prompt */
  onResetToServerDefault?: () => void;
  runsBusy: boolean;
};

export function PromptEngineeringTab({
  systemPrompt,
  onSystemPromptChange,
  onResetToServerDefault,
  runsBusy,
}: Props) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-black">
          System prompt (AI Judge)
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Edit the system rubric. This value is sent when you run stability tests
          (POST{" "}
          <code className="rounded bg-neutral-100 px-1 font-mono text-xs">
            /api/evaluate
          </code>
          ). The latest text is stored in this browser (localStorage) so it
          survives refresh. If empty, the server default applies when you run.
        </p>
      </div>
      <textarea
        value={systemPrompt}
        onChange={(e) => onSystemPromptChange(e.target.value)}
        disabled={runsBusy}
        spellCheck={false}
        className="min-h-[min(50vh,28rem)] w-full resize-y rounded-lg border border-neutral-300 bg-white p-4 font-mono text-sm leading-relaxed text-neutral-900 shadow-sm focus:border-[#0066ff] focus:outline-none focus:ring-1 focus:ring-[#0066ff] disabled:cursor-not-allowed disabled:bg-neutral-100"
        placeholder="Loading default prompt from API…"
      />
      <button
        type="button"
        disabled={runsBusy}
        onClick={() => {
          if (onResetToServerDefault) {
            onResetToServerDefault();
            return;
          }
          fetch(`${API_BASE}/api/system-prompt`)
            .then((r) => r.json() as Promise<{ system_prompt?: string }>)
            .then((data) => {
              if (typeof data.system_prompt === "string") {
                onSystemPromptChange(data.system_prompt);
              }
            });
        }}
        className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Reset to server default
      </button>
    </div>
  );
}
