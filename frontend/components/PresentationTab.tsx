"use client";

import { useState } from "react";

type Slide = {
  title: string;
  subtitle: string;
  bullets: string[];
};

const SLIDES: Slide[] = [
  {
    title: "Q1, Q2, Q3: The False Positive Trap & Policy-as-Code",
    subtitle: "Diagnosing Rubric-Induced Bias",
    bullets: [
      "Q1 — Root cause: Keyword-based scanning flags UI elements indiscriminately.",
      "Q2 — Rubric: Balanced rubric separates UI descriptions from WORM manipulation.",
      "Q3 — Ops: Prompt tuning in the UI for continuous KSL control.",
    ],
  },
  {
    title: "Q4, Q5: Validation & Second-Order Effects",
    subtitle: "N× Stability Testing",
    bullets: [
      "Q4 — Validation: N× runs on the golden dataset catch FP/FN drift (e.g., audit-trail edits).",
      "Q5 — Guardrails: Circuit breaker on invalid JSON; token telemetry via Pydantic data contracts.",
    ],
  },
  {
    title: "Q6, Q7: Agent Specifications & Immutable Audit",
    subtitle: "Designing the Gatekeeper",
    bullets: [
      "Q6 — Determinism: Temperature 0 + strict JSON schemas for structured decision output.",
      "Q7 — Audit: Algorithmic readability checks + LLM compliance; stored reasoning with merged dimensions.",
    ],
  },
  {
    title: "Q8: Calibration & Routing Strategy",
    subtitle: "Beyond Hard-coded Rules",
    bullets: [
      "Q8 — Phase 1: Shadow mode for inter-rater agreement.",
      "Q8 — Phase 2: Dynamic confidence thresholds for auto-pass vs. rework.",
      "Q8 — Phase 3: Human-in-the-loop (HITL) escalation for legal gray areas.",
    ],
  },
  {
    title: "Q9, Q10: The Decoupled Feedback Loop",
    subtitle: "Anti-Pattern Database (RAG)",
    bullets: [
      "Q9 — Design: SQLite anti-pattern registry reduces agent-to-agent confirmation bias.",
      "Q10 — Execution: Retrieval of past FAILs as negative few-shot before drafting.",
    ],
  },
];

export function PresentationTab() {
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx]!;
  const last = SLIDES.length - 1;

  return (
    <div className="flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 py-2">
      <div className="flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          Slide {idx + 1} / {SLIDES.length}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="rounded border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-800 hover:border-neutral-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setIdx((i) => Math.min(last, i + 1))}
            disabled={idx === last}
            className="rounded border border-blue-600 bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <div
        className="relative w-full max-w-5xl overflow-hidden rounded-lg border border-neutral-200 bg-white"
        style={{ aspectRatio: "16 / 9" }}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex min-h-0 flex-1 flex-col justify-center px-8 py-8 sm:px-12 sm:py-10 lg:px-14 lg:py-12">
            <h2 className="text-balance text-2xl font-semibold leading-snug tracking-tight text-neutral-900 sm:text-3xl lg:text-[1.75rem] xl:text-[2rem]">
              {slide.title}
            </h2>
            <p className="mt-3 text-pretty text-base leading-relaxed text-neutral-600 sm:text-lg">
              {slide.subtitle}
            </p>
            <ul className="mt-6 space-y-2.5 text-left text-sm leading-relaxed text-neutral-800 sm:mt-8 sm:space-y-3 sm:text-base">
              {slide.bullets.map((b) => (
                <li key={b} className="flex gap-3">
                  <span
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-600"
                    aria-hidden
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="shrink-0 px-8 pb-4 pt-1 text-right text-xs tracking-wide text-gray-400 sm:px-12 lg:px-14">
            KSL · SEC 17a-4
          </p>
        </div>
      </div>
    </div>
  );
}
