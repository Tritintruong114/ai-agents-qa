# ai-agents-qa — A2A (minimal)

**What:** SEC 17a-4 PoC — **backend/** FastAPI + SSE + SQLite; **frontend/** Next.js. **Env:** `OPENAI_API_KEY` in `backend/.env`. API `http://localhost:8000` · UI `http://localhost:3000` (`frontend/lib/constants` `API_BASE`).

**Run:** `cd backend && uvicorn main:app --reload` · `cd frontend && npm run dev`

**Judge output** (`contracts.py` → `QAEvaluationResult`): `is_ui_description`, `reasoning`, `evidence_quote`, `compliance_status` (PASS/WARNING/FAIL), `confidence_score` (0–1). Dim 08 (`textstat`) merges into `reasoning` via `merge_qa_with_readability`; bad JSON → `CIRCUIT_BREAKER`.

**Prompt:** Default = `SYSTEM_PROMPT` in `main.py` (Dim 03 adversarial rubric). `GET /api/system-prompt`. Overrides live in **`localStorage`** `ai-agents-qa.system-prompt.v1` (non-empty wins on load; **Reset** clears + refetch).

**Evaluate:** `POST/GET /api/evaluate/{id}` + body/query `{ temperature, system_prompt?, shadow_mode? }` → SSE: `readability_dimension` → `reasoning_delta` → `final_result` (+ `audit_log_id`). Routing: `calibration_router` in `main.py`.

**DB:** `knowledge_base.db` — `test_cases` (6 seeds), `evaluation_logs` (+ `evidence_quote`). Delete file to re-seed. `GET /api/anti-patterns` = recent FAIL/WARNING.

**UI (Live Demo):** sidebar cases · tabs Evaluation / Prompt / Anti-Pattern · N× stability + trace panels (meta · gates · audit · telemetry) · Publish placeholder.

**Else:** `docs/PITCH_DECK_CONTENT.md` = deck copy. **Issues:** stale prompt → clear `localStorage` key above; bad seeds → delete DB; model errors → fill all schema fields including `evidence_quote`.
