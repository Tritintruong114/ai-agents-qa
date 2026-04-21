# ai-agents-qa — A2A (minimal)

**What:** SEC 17a-4 PoC — **backend/** FastAPI + SSE + SQLite; **frontend/** Next.js. **Env:** `OPENAI_API_KEY` in `backend/.env` (server default). Optional: UI **Config OpenAI key** stores key in **`localStorage`** `ai-agents-qa.openai_api_key` and sends **`X-OpenAI-API-Key`** on `POST /api/evaluate/{id}`; backend builds the OpenAI client with that key when present (`OpenAIChatModel` / `OpenAIModel` + `OpenAIProvider`). Default judge model id: **`gpt-4o`** (dropdown per Variant; POST JSON key **`model`**, Pydantic `openai_model`, allowlist in `main.py`).

**Run:** `cd backend && uvicorn main:app --reload` · `cd frontend && npm run dev`

**Judge output** (`contracts.py` → `QAEvaluationResult`): field order matters — `evidence_quote`, `reasoning`, `is_ui_description`, `compliance_status` (PASS/WARNING/FAIL), `confidence_score` (0–1). **No** `is_audit_caveat_missing` (extend Pydantic + prompt if needed). Dim 08 (`textstat`) merges into `reasoning` via `merge_qa_with_readability`; bad JSON → `CIRCUIT_BREAKER`. SSE `final_result` may also include `readability_dimension`, `routing_decision`, `llm_compliance_status`, `llm_reasoning` from `_evaluate_response_payload` in `main.py`.

**Golden dataset:** Six cases (ids 1–6) with `text_chunk` (draft) + `prd_context` in `test_cases`. `seed_data()` **upserts** those rows on every API startup. Mirror copy in `frontend/lib/constants.ts` (`TEST_CASES`) for labels, PRD/draft display, and `expectedVerdict`.

**Prompt:** Default = `SYSTEM_PROMPT` in `main.py` (Dim 03 adversarial rubric). `GET /api/system-prompt`. Overrides live in **`localStorage`** `ai-agents-qa.system-prompt.v1` (non-empty wins on load; **Reset** clears + refetch).

**Evaluate:** `POST/GET /api/evaluate/{id}` — GET: query `temperature`, `shadow_mode`; POST body also `system_prompt?`, `prd_context?`, `shadow_mode?`, **`model?`** (OpenAI model id) → SSE: `readability_dimension` → `reasoning_delta` → `final_result` (+ `audit_log_id`, `model_name`). User message to the LLM is built with `<PRD_CONTEXT>` + `<DRAFT>` in `main.py` (`_compliance_user_message`). Routing: `calibration_router` in `main.py`.

**Multi-change (one POST):** `EvaluateBody` may set **`temperature` + `system_prompt?` + `prd_context?` + `shadow_mode` + `model?` together**. Optional header **`X-OpenAI-API-Key`**. Effective PRD = non-empty body `prd_context` → else SQLite row → else sentinel. **`text_chunk` (draft) always comes from the DB row for `{id}`** — there is no body override. **GET** only varies query `temperature` / `shadow_mode`; system prompt is always `SYSTEM_PROMPT`, PRD from DB; no per-request model/key override on GET.

**Multi-change (many calls):** Stability **N×** and **A/B** are **independent POSTs** (full SSE each). Golden check: merged `compliance_status` vs row `expected_verdict`.

**Multi-change (repo):** Editing golden copy requires **`frontend/lib/constants.ts` and `backend/database.py` seed** in sync; restart API so `seed_data()` upserts ids 1–6.

**Invariant:** `calibration_router` always uses **LLM verdict + confidence before readability merge**, regardless of knob combination.

**DB:** `knowledge_base.db` — `test_cases` (6 golden rows + optional custom ids), `evaluation_logs` (+ `evidence_quote`, etc.). `GET /api/anti-patterns` = recent FAIL/WARNING.

**UI (Live Demo):** sidebar golden list (expected verdict badges) · tabs Evaluation / Prompt Engineering / Anti-Pattern **/ Data Contracts** · header **Runs** (10/100/1000) · **A/B** toggle · **Config OpenAI key** (modal) · Evaluation: large case title; **Steps + Expected** single column; per-Variant **OpenAI model** + temperature · N× stability heatmap + score (match % + **WARNING/FAIL/other** remainder) · **collapsible** evaluation trace (`<details>`) · Publish placeholder. **Data Contracts** tab documents `QAEvaluationResult` + notes on merged SSE payload.

**Else:** `docs/PITCH_DECK_CONTENT.md` = deck copy. **Full flow (VN) + Mermaid + changelog table:** [README.md](../README.md) — *Cập nhật gần đây*, *Luồng đánh giá*, *Luồng đa thay đổi* (POST knobs / N× / repo sync), và *Sơ đồ luồng*. **Issues:** stale prompt → clear `localStorage` `ai-agents-qa.system-prompt.v1`; stale/wrong OpenAI key from UI → remove `ai-agents-qa.openai_api_key` or use **Remove stored key** in modal; judge errors → fill all schema fields including `evidence_quote`.
