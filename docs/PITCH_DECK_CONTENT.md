# Pitch deck — copy

**Source of truth:** `frontend/components/PresentationTab.tsx` (`SLIDES`). **5 slides** · **10 KSL questions** · Footer in UI: `KSL · SEC 17a-4`.

**Bullet pattern:** `Qn — Label: …` (slides 1–3, 5) · slide 4 uses `Q8 — Phase n: …` for the three routing phases.

---

## Slide 1 — Q1, Q2, Q3

**Title:** Q1, Q2, Q3: The False-Positive Crisis & Semantic Contracts  
**Subtitle:** Rubric-induced bias from keyword-only checks; evidence and reasoning before verdict

- Q1 — Problem: ~81% false positives stem from rubric-induced bias—the legacy pipeline matched keywords mechanically with no understanding of on-screen UI context, so benign interface copy was flagged as risk.
- Q2 & Q6 — Solution: Replace static rules with a semantic contract: Pydantic AI enforces structured outputs, and the evaluator runs at temperature 0.0 for stable, near-deterministic judgments.
- Q3 — Execution: JSON Schema requires explicit evidence (grounded quotes) and step-by-step reasoning before any verdict, constraining choice-supportive bias (post-hoc justification of a preferred outcome).

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

- Q6 — Agent layer: Pydantic AI agents operationalize the same semantic contract—typed tools, schema-validated responses, and temperature 0.0 at each gatekeeper hop.
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