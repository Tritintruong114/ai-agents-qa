import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import Body, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from pydantic_ai import Agent

from contracts import QAEvaluationResult
from database import (
    fetch_test_case_by_id,
    get_anti_patterns,
    init_db,
    insert_evaluation_log,
    seed_data,
)
from readability import evaluate_readability_dimension, merge_qa_with_readability

load_dotenv()

MODEL_NAME = "gpt-4o"

ALLOWED_OPENAI_MODELS = frozenset(
    {
        "gpt-4o-mini",
        "gpt-4o",
        "gpt-4.1",
        "gpt-4-turbo",
        "gpt-4",
        "o4-mini",
        "o3-mini",
        "o1-mini",
    }
)

SYSTEM_PROMPT = """[Dimension 03 · SEC 17a-4 — Semantic Gate + Adversarial QA — SYSTEM]

ROLE
You are an Adversarial Auditor, strictly enforcing SEC 17a-4 Compliance at LeapXpert. Your mission: uncover risk vulnerabilities that the Generation Agent may have concealed within the draft. You must remain absolutely unbiased.

METHODOLOGY
Analyze the REAL-WORLD CONTEXT of the phrasing; do not rely on mechanical keyword matching.
Your core task is to clearly distinguish between:
(A) Harmless UI/UX Operations: Actions affecting only local display, filters, or client-side/app session states.
(B) Backend/Immutable Architecture Statements: Claims or implications regarding WORM storage, audit trails, business channel synchronization, or any backend process where deletion, modification, or disabling flows could violate SEC 17a-4 integrity.

When in doubt, prioritize data impact reasoning: Could this action delete/modify original records, logs, or mandatory retention flows? Do not focus solely on UI terminology.

NEGATIVE CONSTRAINTS
Never ignore "implications": If a sentence suggests legal or technical consequences (even if not stated explicitly), treat it as a compliance risk; do not issue an optimistic PASS.
Automatic skepticism of ambiguous terms: (e.g., "cleanup", "refresh", "free up space", "purge", "reconcile", "archive" when the meaning is unclear):

MANDATORY: Cross-reference provided PRD_Context / specs (or explicitly state "missing PRD" in your reasoning).
Only PASS if the PRD confirms the operation impacts only the UI/local cache and DOES NOT delete/modify original backend/WORM data.
If it cannot be inferred from the PRD or if deletion/modification of original data is possible → DO NOT PASS; usually result in WARNING (missing caveat) or FAIL (confirmed violation).
Strict Policy: Lack of clear safety evidence in PRD_Context → prioritize FAIL.
No static mapping: The same word can be PASS or FAIL depending on the subject (UI-only vs. Backend/WORM).

SCORING RULES (DIMENSION 03 — COMPLIANCE)
Classification Step: Extract the subject — is this describing a UI operation or a statement about storage systems/backend/compliance?

PASS (compliance_status: PASS):
Describes only UI/UX experience; no impact on immutable storage/SEC 17a-4 based on context and PRD.
Set is_ui_description: true.
Example: "Users can swipe to hide/remove this message from the chat screen on the mobile app." (Removes from view/local UI, no claim of deleting WORM records).

WARNING (compliance_status: WARNING — does not block publishing):
Technically correct but legally misleading, lacks SEC-standard definitions, or misses warnings when mentioning retention limits — NO clear WORM violation.
Example: "The system uses a retention clock to track message age." → Suggest changing to "retention period commencement" or adding definitions; is_ui_description: false.

FAIL (compliance_status: FAIL — blocks publishing):
Direct or implied statements: permanent deletion of non-WORM compliant data, altering audit logs, disabling mandatory sync flows, breaking immutability, or missing PRD evidence to rule out backend risk.
is_ui_description: false (even if it looks like UI but implicitly describes backend behavior).
Example: "Admins can configure permanent deletion of original data from the server after project completion."

LANGUAGE & OUTPUT
Reasoning and evidence_quote are mandatory. Strictly adhere to the Output Contract (JSON schema / Pydantic): every verdict must include reasoning + evidence_quote from the Draft or PRD_Context to prevent hallucinations.

CONFIDENCE (required): confidence_score must be a float from 0.0 to 1.0 — your confidence in compliance_status (0.0 = no confidence, 1.0 = very confident).\n"""

_MISSING_PRD_SENTINEL = (
    "(none provided — if PRD evidence is required for a safe PASS, state 'missing PRD' in reasoning.)"
)


def _compliance_user_message(draft: str, *, prd_context: str | None = None) -> str:
    """Wrap draft (+ optional PRD) in XML-like delimiters so instructions and data stay separated."""
    prd_block = (prd_context or "").strip() or _MISSING_PRD_SENTINEL
    return (
        "Analyze the following inputs.\n\n"
        f"<PRD_CONTEXT>\n{prd_block}\n</PRD_CONTEXT>\n\n"
        f"<DRAFT>\n{draft}\n</DRAFT>"
    )


def _openai_model_with_provider(api_key: str, model_id: str):
    """Build an OpenAI-backed model using an explicit API key (per-request from UI)."""
    try:
        from pydantic_ai.providers.openai import OpenAIProvider
    except ImportError as e:
        raise ValueError(
            "pydantic-ai OpenAI provider is missing; upgrade pydantic-ai with OpenAI extras."
        ) from e
    provider = OpenAIProvider(api_key=api_key.strip())
    try:
        from pydantic_ai.models.openai import OpenAIChatModel

        return OpenAIChatModel(model_id, provider=provider)
    except ImportError:
        pass
    try:
        from pydantic_ai.models.openai import OpenAIModel

        return OpenAIModel(model_id, provider=provider)
    except ImportError as e:
        raise ValueError(
            "Could not import OpenAIChatModel or OpenAIModel from pydantic-ai."
        ) from e


def _make_compliance_agent(
    system_prompt: str,
    model_id: str,
    openai_api_key: str | None = None,
) -> Agent:
    common = dict(
        output_type=QAEvaluationResult,
        system_prompt=system_prompt,
        defer_model_check=True,
    )
    key = (openai_api_key or "").strip()
    if key:
        try:
            model = _openai_model_with_provider(key, model_id)
            return Agent(model, **common)
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"OpenAI client setup failed: {e}") from e
    return Agent(f"openai:{model_id}", **common)


CIRCUIT_BREAKER = QAEvaluationResult(
    evidence_quote="",
    reasoning="AI response failed schema validation (circuit breaker).",
    is_ui_description=False,
    compliance_status="FAIL",
    confidence_score=0.0,
)

_ITEM_ALIASES = {
    "fp-1": "1",
    "fp-2": "2",
    "fp-3": "3",
    "tp-1": "4",
    "fn-1": "5",
    "fn-2": "6",
}


class EvaluateBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    temperature: float = Field(0.0, ge=0.0, le=2.0)
    system_prompt: str | None = None
    prd_context: str | None = Field(
        None,
        description="Optional PRD / spec text; overrides DB when set. Wrapped in <PRD_CONTEXT> for the agent.",
    )
    shadow_mode: bool = Field(
        True,
        description="True = phase 1 (log routing only). False = dynamic thresholds + enforcement.",
    )
    openai_model: str = Field(
        default=MODEL_NAME,
        alias="model",
        description="OpenAI model id (e.g. gpt-4o). JSON key: model.",
    )

    @field_validator("openai_model")
    @classmethod
    def _validate_openai_model(cls, v: str) -> str:
        m = v.strip()
        if m not in ALLOWED_OPENAI_MODELS:
            raise ValueError(
                f"Unsupported model {m!r}. Allowed: {sorted(ALLOWED_OPENAI_MODELS)}"
            )
        return m


def calibration_router(
    status: str,
    confidence: float,
    is_shadow_mode: bool = True,
) -> str:
    """
    Routing strategy (Q8): Shadow mode vs dynamic thresholds.
    Uses LLM verdict (Dimension 03) and confidence_score.
    """
    if is_shadow_mode:
        return "SHADOW_LOG_ONLY"

    if status == "PASS":
        return "AUTO_PASS"

    if status == "FAIL" and confidence >= 0.90:
        return "AUTO_REWORK"

    if status in ("WARNING", "FAIL") and confidence < 0.90:
        return "ESCALATE_TO_KSL"

    return "ESCALATE_TO_KSL"


def _evaluate_response_payload(
    item: dict,
    evaluation: QAEvaluationResult,
    *,
    readability_dimension: dict | None = None,
    llm_compliance_status: str | None = None,
    llm_reasoning: str | None = None,
    routing_decision: str | None = None,
    is_shadow_mode: bool | None = None,
) -> dict:
    ev = evaluation.model_dump()
    payload: dict = {
        "id": item["id"],
        "text_chunk": item.get("text_chunk", ""),
        "is_ui_description": ev["is_ui_description"],
        "reasoning": ev["reasoning"],
        "evidence_quote": ev.get("evidence_quote", ""),
        "compliance_status": ev["compliance_status"],
    }
    if item.get("category"):
        payload["category"] = item["category"]
    if item.get("title"):
        payload["title"] = item["title"]
    if item.get("expected_verdict"):
        payload["expected_verdict"] = item["expected_verdict"]
    if readability_dimension is not None:
        payload["readability_dimension"] = readability_dimension
    if llm_compliance_status is not None:
        payload["llm_compliance_status"] = llm_compliance_status
    if llm_reasoning is not None:
        payload["llm_reasoning"] = llm_reasoning
    if routing_decision is not None:
        payload["routing_decision"] = routing_decision
    if is_shadow_mode is not None:
        payload["is_shadow_mode"] = is_shadow_mode
    return payload


def _resolve_item_key(item_id: str) -> str:
    raw = item_id.strip()
    return _ITEM_ALIASES.get(raw.lower(), raw)


def _sse_data(obj: dict) -> str:
    return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"


def _effective_system_prompt(system_prompt: str | None) -> str:
    if system_prompt is None:
        return SYSTEM_PROMPT
    stripped = system_prompt.strip()
    return stripped if stripped else SYSTEM_PROMPT


def _prd_from_item(item: dict) -> str | None:
    raw = item.get("prd_context")
    if not isinstance(raw, str) or not raw.strip():
        return None
    return raw


async def _stream_evaluate_events(
    item: dict,
    key: str,
    text_chunk: str,
    temperature: float,
    system_prompt: str,
    is_shadow_mode: bool = True,
    prd_context: str | None = None,
    model_id: str = MODEL_NAME,
    openai_api_key: str | None = None,
) -> AsyncIterator[str]:
    # Dimension 08: algorithmic readability (0 tokens, instant)
    readability = evaluate_readability_dimension(text_chunk)
    yield _sse_data({"readability_dimension": readability})

    try:
        agent = _make_compliance_agent(system_prompt, model_id, openai_api_key)
    except ValueError as e:
        yield _sse_data({"error": str(e)})
        return
    user_message = _compliance_user_message(text_chunk, prd_context=prd_context)
    try:
        async with agent.run_stream(
            user_message,
            model_settings={"temperature": temperature},
        ) as result:
            prev_reasoning = ""
            async for partial in result.stream_output(debounce_by=None):
                r = partial.reasoning or ""
                if len(r) > len(prev_reasoning):
                    delta = r[len(prev_reasoning) :]
                    prev_reasoning = r
                    if delta:
                        yield _sse_data({"reasoning_delta": delta})

            final_eval = await result.get_output()
            llm_status = final_eval.compliance_status
            route = calibration_router(
                llm_status,
                final_eval.confidence_score,
                is_shadow_mode,
            )
            merged_eval = merge_qa_with_readability(final_eval, readability)
            usage = result.usage()
            pt = int(usage.input_tokens or 0)
            ct = int(usage.output_tokens or 0)
            audit_log_id = insert_evaluation_log(
                test_case_id=key,
                temperature=temperature,
                is_ui_description=merged_eval.is_ui_description,
                compliance_status=merged_eval.compliance_status,
                reasoning=merged_eval.reasoning,
                prompt_tokens=pt,
                completion_tokens=ct,
                confidence_score=merged_eval.confidence_score,
                routing_decision=route,
                evidence_quote=merged_eval.evidence_quote,
            )
            final_body = _evaluate_response_payload(
                item,
                merged_eval,
                readability_dimension=readability,
                llm_compliance_status=llm_status,
                llm_reasoning=final_eval.reasoning,
                routing_decision=route,
                is_shadow_mode=is_shadow_mode,
            )
            yield _sse_data(
                {
                    "final_result": final_body,
                    "model_name": model_id,
                    "temperature": temperature,
                    "audit_log_id": audit_log_id,
                    "usage": {
                        "prompt_tokens": pt,
                        "completion_tokens": ct,
                    },
                }
            )
    except ValidationError:
        merged_cb = merge_qa_with_readability(CIRCUIT_BREAKER, readability)
        route_cb = calibration_router(
            CIRCUIT_BREAKER.compliance_status,
            CIRCUIT_BREAKER.confidence_score,
            is_shadow_mode,
        )
        audit_log_id = insert_evaluation_log(
            test_case_id=key,
            temperature=temperature,
            is_ui_description=merged_cb.is_ui_description,
            compliance_status=merged_cb.compliance_status,
            reasoning=merged_cb.reasoning,
            prompt_tokens=0,
            completion_tokens=0,
            confidence_score=merged_cb.confidence_score,
            routing_decision=route_cb,
            evidence_quote=merged_cb.evidence_quote,
        )
        final_body = _evaluate_response_payload(
            item,
            merged_cb,
            readability_dimension=readability,
            llm_compliance_status=CIRCUIT_BREAKER.compliance_status,
            llm_reasoning=CIRCUIT_BREAKER.reasoning,
            routing_decision=route_cb,
            is_shadow_mode=is_shadow_mode,
        )
        yield _sse_data(
            {
                "final_result": final_body,
                "model_name": model_id,
                "temperature": temperature,
                "audit_log_id": audit_log_id,
                "usage": {"prompt_tokens": 0, "completion_tokens": 0},
            }
        )
    except Exception as e:  # pragma: no cover
        yield _sse_data({"error": str(e)})


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_data()
    yield


app = FastAPI(
    title="KSL LeapXpert Compliance QA Agent API (SSE)",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/system-prompt")
async def get_system_prompt():
    return {"system_prompt": SYSTEM_PROMPT}


@app.get("/api/anti-patterns")
async def api_anti_patterns(
    limit: int = Query(
        20,
        ge=1,
        le=500,
        description="Max FAIL/WARNING rows (newest first).",
    ),
):
    return get_anti_patterns(limit)


def _sse_response(gen: AsyncIterator[str]) -> StreamingResponse:
    return StreamingResponse(
        gen,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/evaluate/{item_id}")
async def evaluate_get(
    item_id: str,
    temperature: float = Query(
        0.0,
        ge=0.0,
        le=2.0,
        description="Sampling temperature (0 = more deterministic). E.g. ?temperature=0.7",
    ),
    shadow_mode: bool = Query(
        True,
        description="True = shadow (log routing only). False = enforcement + dynamic thresholds.",
    ),
):
    key = _resolve_item_key(item_id)
    item = fetch_test_case_by_id(key)
    if item is None:
        raise HTTPException(
            status_code=404,
            detail=f"No item with id={item_id!r}. Use 1–6 (or aliases fp-1…fp-3, tp-1, fn-1, fn-2).",
        )
    text_chunk = item.get("text_chunk", "")
    return _sse_response(
        _stream_evaluate_events(
            item,
            key,
            text_chunk,
            temperature,
            SYSTEM_PROMPT,
            shadow_mode,
            prd_context=_prd_from_item(item),
        )
    )


@app.post("/api/evaluate/{item_id}")
async def evaluate_post(
    item_id: str,
    request: Request,
    body: EvaluateBody = Body(...),
):
    key = _resolve_item_key(item_id)
    item = fetch_test_case_by_id(key)
    if item is None:
        raise HTTPException(
            status_code=404,
            detail=f"No item with id={item_id!r}. Use 1–6 (or aliases fp-1…fp-3, tp-1, fn-1, fn-2).",
        )
    text_chunk = item.get("text_chunk", "")
    effective = _effective_system_prompt(body.system_prompt)
    if body.prd_context is not None and str(body.prd_context).strip() != "":
        prd_effective = str(body.prd_context)
    else:
        prd_effective = _prd_from_item(item)
    header_key = request.headers.get("x-openai-api-key") or request.headers.get(
        "X-OpenAI-API-Key"
    )
    openai_api_key = header_key.strip() if header_key else None
    return _sse_response(
        _stream_evaluate_events(
            item,
            key,
            text_chunk,
            body.temperature,
            effective,
            body.shadow_mode,
            prd_context=prd_effective,
            model_id=body.openai_model,
            openai_api_key=openai_api_key,
        )
    )
