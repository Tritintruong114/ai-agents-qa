# Pitch deck — copy

**Source of truth:** `frontend/components/PresentationTab.tsx` (`SLIDES`). **5 slides** · **10 KSL questions** · Footer in UI: `KSL · SEC 17a-4`.

**Bullet pattern:** `Qn — Label: …` (slides 1–3, 5) · slide 4 uses `Q8 — Phase n: …` for the three routing phases.

---

## Slide 1 — Q1, Q2, Q3

**Title:** Q1, Q2, Q3: The False Positive Trap & Policy-as-Code  
**Subtitle:** Diagnosing Rubric-Induced Bias

- Q1 — Root cause: Keyword-based scanning flags UI elements indiscriminately.
- Q2 — Rubric: Balanced rubric separates UI descriptions from WORM manipulation.
- Q3 — Ops: Prompt tuning in the UI for continuous KSL control.

---

## Slide 2 — Q4, Q5

**Title:** Q4, Q5: Validation & Second-Order Effects  
**Subtitle:** N× Stability Testing

- Q4 — Validation: N× runs on the golden dataset catch FP/FN drift (e.g., audit-trail edits).
- Q5 — Guardrails: Circuit breaker on invalid JSON; token telemetry via Pydantic data contracts.

---

## Slide 3 — Q6, Q7

**Title:** Q6, Q7: Agent Specifications & Immutable Audit  
**Subtitle:** Designing the Gatekeeper

- Q6 — Determinism: Temperature 0 + strict JSON schemas for structured decision output.
- Q7 — Audit: Algorithmic readability checks + LLM compliance; stored reasoning with merged dimensions.

---

## Slide 4 — Q8

**Title:** Q8: Calibration & Routing Strategy  
**Subtitle:** Beyond Hard-coded Rules

- Q8 — Phase 1: Shadow mode for inter-rater agreement.
- Q8 — Phase 2: Dynamic confidence thresholds for auto-pass vs. rework.
- Q8 — Phase 3: Human-in-the-loop (HITL) escalation for legal gray areas.

---

## Slide 5 — Q9, Q10

**Title:** Q9, Q10: The Decoupled Feedback Loop  
**Subtitle:** Anti-Pattern Database (RAG)

- Q9 — Design: SQLite anti-pattern registry reduces agent-to-agent confirmation bias.
- Q10 — Execution: Retrieval of past FAILs as negative few-shot before drafting.