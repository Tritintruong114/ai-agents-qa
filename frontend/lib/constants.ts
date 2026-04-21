export const API_BASE = "http://localhost:8000";

/** FastAPI built-in OpenAPI UIs and schema (same origin as `API_BASE`). */
export const API_DOCS_URL = `${API_BASE}/docs`;
export const API_REDOC_URL = `${API_BASE}/redoc`;
export const API_OPENAPI_JSON_URL = `${API_BASE}/openapi.json`;

export const DEFAULT_STABILITY_RUN_COUNT = 10;
export const STABILITY_RUN_OPTIONS = [10, 100, 1000] as const;

/** OpenAI model ids for the compliance judge (must stay in sync with backend allowlist). */
export const DEFAULT_OPENAI_MODEL = "gpt-4o";
export const OPENAI_EVAL_MODEL_OPTIONS = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4.1",
  "gpt-4-turbo",
  "gpt-4",
  "o4-mini",
  "o3-mini",
  "o1-mini",
] as const;
export type OpenAiEvalModelId = (typeof OPENAI_EVAL_MODEL_OPTIONS)[number];

export type GoldenExpectedVerdict = "PASS" | "WARNING" | "FAIL";

/** Old vs semantic gatekeeper — pitch / demo copy (SEC framing). */
export type ArchitectureContrast = {
  oldHeading: string;
  oldBody: string;
  newHeading: string;
  newBody: string;
};

export type TestCase = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  expected: string;
  expectedVerdict: GoldenExpectedVerdict;
  secGroup: string;
  prdContext: string;
  draftText: string;
  architectureContrast: ArchitectureContrast;
};

export const TEST_CASES: TestCase[] = [
  {
    id: "1",
    title: "UI-only hide/delete; archive untouched",
    summary:
      "Golden PASS — hide/delete on mobile UI only; PRD keeps messages in SEC WORM for 7 years.",
    steps: [
      "Read <DRAFT> and <PRD_CONTEXT> together.",
      "Confirm swipe hide/delete is view-level only vs archive destruction.",
    ],
    expected:
      "PASS — local UI removal; WORM archive unchanged; aligned with PRD.",
    expectedVerdict: "PASS",
    secGroup: "Golden · expect PASS",
    prdContext:
      "Messages are hidden from the local mobile view but remain in the SEC WORM archive for 7 years.",
    draftText:
      "Users can swipe to hide or delete this message from their mobile chat screen.",
    architectureContrast: {
      oldHeading: "Old System (Keyword Matching)",
      oldBody:
        'Marks FAIL immediately because the scanner saw the word "delete". Classic rubric-induced bias: safe docs get blocked and CI/CD stalls.',
      newHeading: "New System (Semantic AI Gatekeeper)",
      newBody:
        'Marks PASS. The model treats "from their mobile chat screen" as local UI-only behavior while source records remain in the SEC WORM archive.',
    },
  },
  {
    id: "2",
    title: '"Purge" is device cache only, not the vault',
    summary:
      "Golden PASS — draft is local cache purge; PRD says core vault untouched.",
    steps: [
      "Scope purge to device cache vs server vault.",
      "Match 24h cache behavior with PRD.",
    ],
    expected:
      "PASS — cache-only; no impact on regulated vault.",
    expectedVerdict: "PASS",
    secGroup: "Golden · expect PASS",
    prdContext:
      "Local cache clears every 24h. Core vault remains untouched.",
    draftText:
      "The app purges local cache to free up device storage.",
    architectureContrast: {
      oldHeading: "Old System (Keyword Matching)",
      oldBody:
        'Marks FAIL on a high-risk keyword hit for "purges", yielding a false positive.',
      newHeading: "New System (Semantic AI)",
      newBody:
        'Marks PASS. The model reads context and treats "local cache" as ephemeral device storage, not the WORM vault core.',
    },
  },
  {
    id: "3",
    title: "Legally ambiguous wording",
    summary:
      "Golden WARNING — “retention clock” is informal; PRD anchors retention to message creation.",
    steps: [
      "Check whether UI wording matches formal retention start rules.",
      "Flag ambiguous metaphors for SEC-aligned copy.",
    ],
    expected:
      "WARNING — clarify terminology vs PRD (retention from creation).",
    expectedVerdict: "WARNING",
    secGroup: "Golden · expect WARNING",
    prdContext:
      "Retention period starts from message creation.",
    draftText:
      "The system uses a retention clock to track message storage.",
    architectureContrast: {
      oldHeading: "Old System",
      oldBody:
        "Often marks PASS when no forbidden keyword appears, missing latent legal risk (false negative).",
      newHeading: "New System",
      newBody:
        'Marks WARNING. The model checks SEC 17a-4 expectations and flags "retention clock" as imprecise language, requesting auditor-safe terminology.',
    },
  },
  {
    id: "4",
    title: "Missing audit caveat",
    summary:
      "Golden WARNING — edit window is stated; PRD requires immutable original in audit log — draft should surface audit caveat.",
    steps: [
      "Compare edit UX copy with audit-log preservation in PRD.",
      "Require explicit audit/immutable messaging if missing.",
    ],
    expected:
      "WARNING — add audit/immutable-original disclosure per PRD.",
    expectedVerdict: "WARNING",
    secGroup: "Golden · expect WARNING",
    prdContext:
      "Edited messages retain the original version in the immutable audit log.",
    draftText:
      "Users can edit their sent messages within 15 minutes.",
    architectureContrast: {
      oldHeading: "Old System",
      oldBody:
        'Marks FAIL if "edit" is blocked, or PASS blindly. It cannot state precisely what the documentation is missing.',
      newHeading: "New System",
      newBody:
        "Marks WARNING. The model detects an omission: the UI behavior is described but there is no caveat that the original remains in the immutable audit log.",
    },
  },
  {
    id: "5",
    title: "Early archive erase (before retention)",
    summary:
      "Golden FAIL — PRD allows super-admin erase before 7-year SEC window without court order.",
    steps: [
      "Map server-side permanent delete to PRD warm-archive policy.",
      "Treat as blocking FAIL when retention/WORM is violated.",
    ],
    expected:
      "FAIL — early archive destruction inconsistent with SEC retention.",
    expectedVerdict: "FAIL",
    secGroup: "Golden · expect FAIL",
    prdContext:
      "Super-admins can force-delete warm-archive objects before the 7-year SEC window without court orders.",
    draftText:
      "Organization super admins may permanently delete archived messages from the server, freeing storage immediately.",
    architectureContrast: {
      oldHeading: "Old System",
      oldBody:
        'Marks FAIL as soon as it sees "permanently delete". Correct outcome, but purely mechanical reasoning.',
      newHeading: "New System",
      newBody:
        'Marks FAIL because the model ties "freeing storage immediately" to a breach of SEC 17a-4 seven-year immutable retention.',
    },
  },
  {
    id: "6",
    title: "Compliance sync disabled (subtle trap)",
    summary:
      "Golden FAIL — PRD allows pausing sync to SEC vault; breaks continuous capture.",
    steps: [
      "Infer impact of disabled compliance sync on vault mirroring.",
      "Treat halt of SEC vault flow as FAIL under 17a-4 expectations.",
    ],
    expected:
      "FAIL — compliance pipeline must not be arbitrarily disabled.",
    expectedVerdict: "FAIL",
    secGroup: "Golden · expect FAIL",
    prdContext:
      "Sync pipelines can be paused by tenant admins, halting data flow to the SEC vault.",
    draftText:
      "Admins can disable the compliance sync pipeline during maintenance windows.",
    architectureContrast: {
      oldHeading: "Old System",
      oldBody:
        'Marks PASS as routine IT/DevOps ("maintenance", "disable") with no banned word like "delete"—a dangerous false negative.',
      newHeading: "New System",
      newBody:
        'Marks FAIL. The model infers that turning off sync creates an audit blind spot and breaks SEC recordkeeping continuity.',
    },
  },
];
