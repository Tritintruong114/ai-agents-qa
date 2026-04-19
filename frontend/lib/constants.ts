export const API_BASE = "http://localhost:8000";

/** FastAPI built-in OpenAPI UIs and schema (same origin as `API_BASE`). */
export const API_DOCS_URL = `${API_BASE}/docs`;
export const API_REDOC_URL = `${API_BASE}/redoc`;
export const API_OPENAPI_JSON_URL = `${API_BASE}/openapi.json`;

export const DEFAULT_STABILITY_RUN_COUNT = 10;
export const STABILITY_RUN_OPTIONS = [10, 100, 1000] as const;

export type OldVerdict = "PASS" | "FAIL";

export type TestCase = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  expected: string;
  oldAgentVerdict: OldVerdict;
  secGroup: string;
};

export const TEST_CASES: TestCase[] = [
  {
    id: "1",
    title: "UI Deletion Button",
    summary:
      "False positive group — keyword scan false alarm; gatekeeper expects PASS.",
    steps: [
      "Read the Delete control description on the UI",
      "Distinguish hide-from-screen vs WORM vault deletion",
    ],
    expected:
      "PASS — UI-only hide for messages; no physical retention store impact.",
    oldAgentVerdict: "FAIL",
    secGroup: "False Positive",
  },
  {
    id: "2",
    title: "Retention Clock (IT Jargon)",
    summary:
      "False positive group — IT slang; gatekeeper expects PASS.",
    steps: [
      "Recognize “retention clock” in UI-buffer context",
      "Do not infer a legal retention commitment",
    ],
    expected: "PASS — retention jargon, not a legal commitment.",
    oldAgentVerdict: "FAIL",
    secGroup: "False Positive",
  },
  {
    id: "3",
    title: "Display Retention Window (View Config)",
    summary:
      "False positive group — display configuration; gatekeeper expects PASS.",
    steps: [
      "Check retention period shown on the app screen",
      "Contrast with underlying WORM vault",
    ],
    expected:
      "PASS — user-facing display only; no impact on authoritative WORM.",
    oldAgentVerdict: "FAIL",
    secGroup: "False Positive",
  },
  {
    id: "4",
    title: "WORM Data Deletion (SEC 17a-4 Violation)",
    summary:
      "True positive group — clear violation; gatekeeper expects FAIL.",
    steps: [
      "Identify permanent deletion in the WORM vault",
      "Map to SEC Rule 17a-4(f)",
    ],
    expected:
      "FAIL — overwriting or deleting WORM records is prohibited.",
    oldAgentVerdict: "FAIL",
    secGroup: "True Positive",
  },
  {
    id: "5",
    title: "Disable Monitored Chat Channel",
    summary:
      "False negative group — missed risk; gatekeeper expects FAIL.",
    steps: [
      "Turn off sync and logging for WhatsApp Business",
      "Assess FINRA/SEC business communications capture",
    ],
    expected:
      "FAIL — regulated channel logging cannot be disabled.",
    oldAgentVerdict: "PASS",
    secGroup: "False Negative",
  },
  {
    id: "6",
    title: "Audit Trail Modification",
    summary:
      "False negative group — history tampering; gatekeeper expects FAIL.",
    steps: [
      "Edit historical SMS content before export",
      "Check audit trail immutability",
    ],
    expected:
      "FAIL — audit trails must be immutable; editing history violates policy.",
    oldAgentVerdict: "PASS",
    secGroup: "False Negative",
  },
];
