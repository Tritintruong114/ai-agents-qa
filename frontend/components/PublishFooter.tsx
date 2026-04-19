type Props = {
  stabilityRunCount: number;
  abTestingMode: boolean;
  publishDisabled: boolean;
};

export function PublishFooter({
  stabilityRunCount,
  abTestingMode,
  publishDisabled,
}: Props) {
  return (
    <div className="border-t border-neutral-200 px-5 py-4 lg:px-8">
      <button
        type="button"
        disabled={publishDisabled}
        title={
          publishDisabled
            ? `Need ${stabilityRunCount}/${stabilityRunCount} PASS on every visible variant (no WARNING/FAIL).`
            : "Submit results to Freshdesk"
        }
        className="w-full rounded-lg border border-transparent bg-[#0066ff] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0052cc] disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-200 disabled:text-neutral-500"
      >
        Publish to Freshdesk
      </button>
      <p className="mt-2 text-center text-[11px] text-neutral-500">
        Enabled only when all runs are PASS (no yellow/red):{" "}
        {abTestingMode ? "A and B." : "Variant A only."}
      </p>
    </div>
  );
}
