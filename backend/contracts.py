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
    """Structured LLM gatekeeper output (Dimension 03 — SEC compliance)."""

    is_ui_description: bool
    reasoning: str = Field(..., description="Detailed explanation in English.")
    evidence_quote: str = Field(
        ...,
        description=(
            "Verbatim excerpt from the evaluated draft (or state 'missing PRD' if applicable) "
            "supporting the verdict; reduces hallucination risk."
        ),
    )
    compliance_status: Literal["PASS", "WARNING", "FAIL"]
    confidence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description=(
            "Confidence in the SEC verdict (0.0–1.0); used for calibration / routing (Q8)."
        ),
    )
