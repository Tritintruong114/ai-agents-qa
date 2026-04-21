from typing import Literal

from pydantic import BaseModel, Field


class DimensionEvaluation(BaseModel):
    """Generic schema for one evaluation dimension (e.g. docs / Q8 calibration)."""

    dimension: str
    status: Literal["PASS", "WARNING", "FAIL"]
    reasoning: str
    confidence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model confidence in this verdict (0.0–1.0).",
    )


class QAEvaluationResult(BaseModel):
    """Structured LLM gatekeeper output (Dimension 03 — SEC compliance).

    Field order is intentional: evidence and chain-of-thought precede verdict fields
    so structured output reduces choice-supportive bias toward PASS/FAIL.
    """

    evidence_quote: str = Field(
        ...,
        description=(
            "Verbatim excerpt from the evaluated draft (or state 'missing PRD' if applicable) "
            "supporting the verdict; reduces hallucination risk."
        ),
    )
    reasoning: str = Field(
        ...,
        description=(
            "Chain-of-thought in English against SEC 17a-4; complete before implying verdict."
        ),
    )
    is_ui_description: bool = Field(
        ...,
        description="True only if the draft strictly describes UI-local impact.",
    )
    compliance_status: Literal["PASS", "WARNING", "FAIL"] = Field(
        ...,
        description="Final SEC verdict; must follow evidence_quote and reasoning.",
    )
    confidence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description=(
            "Confidence in compliance_status (0.0–1.0); used for calibration / routing (Q8)."
        ),
    )
