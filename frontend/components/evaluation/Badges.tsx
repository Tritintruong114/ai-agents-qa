import type { ComplianceStatus } from "@/lib/types";
import type { OldVerdict } from "@/lib/constants";

export function ComplianceBadge({
  status,
}: {
  status: ComplianceStatus | null;
}) {
  if (!status) {
    return (
      <span className="inline-flex items-center rounded-md border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
        —
      </span>
    );
  }
  const s = String(status).toUpperCase();
  const styles =
    s === "PASS"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : s === "WARNING"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : s === "FAIL"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-neutral-300 bg-neutral-100 text-neutral-800";

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold tracking-wide ${styles}`}
    >
      {String(status)}
    </span>
  );
}

export function OldVerdictBadge({ verdict }: { verdict: OldVerdict }) {
  const fail = verdict === "FAIL";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border px-1 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide ${
        fail
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
      title="Legacy agent verdict (baseline)"
    >
      Old: {verdict}
    </span>
  );
}

export function UiDescriptionBadge({ value }: { value: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${
        value
          ? "border-sky-200 bg-sky-50 text-sky-900"
          : "border-violet-200 bg-violet-50 text-violet-900"
      }`}
    >
      is_ui_description: {String(value)}
    </span>
  );
}
