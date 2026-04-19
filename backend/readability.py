"""Algorithmic readability (Dimension 08) — no LLM, no tokens."""

from __future__ import annotations

import re
from typing import Literal

import textstat

ComplianceLiteral = Literal["PASS", "WARNING", "FAIL"]

# FK grade (school level): 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
_VOWEL_CLUSTER = re.compile(
    r"[aeiouyàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹ]",
    re.IGNORECASE,
)


def _approx_syllables_word(word: str) -> int:
    w = word.strip("'").lower()
    if not w:
        return 0
    n = len(_VOWEL_CLUSTER.findall(w))
    return max(1, n)


def _flesch_kincaid_grade_fallback(text: str) -> float | None:
    """When textstat fails, approximate FK grade + syllable count (PoC)."""
    raw = text.strip()
    if not raw:
        return None
    words = re.findall(r"[\w']+", raw, flags=re.UNICODE)
    if len(words) < 2:
        return None
    parts = [p for p in re.split(r"[.!?]+", raw) if p.strip()]
    sentences = max(1, len(parts))
    syllables = sum(_approx_syllables_word(w) for w in words)
    if syllables < 1:
        return None
    return 0.39 * (len(words) / sentences) + 11.8 * (syllables / len(words)) - 15.59


def _compute_fk_grade(text: str) -> float | None:
    raw = (text or "").strip()
    if not raw:
        return None
    try:
        v = float(textstat.flesch_kincaid_grade(raw))
        if v != v:  # NaN
            raise ValueError("nan")
        return v
    except Exception:
        return _flesch_kincaid_grade_fallback(raw)


def merge_compliance_status(a: str, b: str) -> ComplianceLiteral:
    """Worst status wins: FAIL > WARNING > PASS."""
    sa = str(a).upper().strip()
    sb = str(b).upper().strip()
    if "FAIL" in (sa, sb):
        return "FAIL"
    if "WARNING" in (sa, sb):
        return "WARNING"
    return "PASS"


def evaluate_readability_dimension(text: str) -> dict:
    """
    Algorithmic check for Dimension 08 (Flesch-Kincaid grade).
    Prefer `textstat`; on failure, use FK formula + approximate syllables (PoC).
    """
    raw = (text or "").strip()
    fk_score = _compute_fk_grade(raw)
    if fk_score is None:
        return {
            "dimension": "Dimension 08: Readability",
            "status": "WARNING",
            "score": None,
            "reasoning": (
                "Cannot compute Flesch-Kincaid for this passage "
                "(text too short or incompatible with the formula)."
            ),
        }

    if fk_score < 10.0:
        status: ComplianceLiteral = "PASS"
        reasoning = (
            f"Flesch-Kincaid grade is {fk_score:.1f} (< 10.0). "
            "Readable and suitable for end users."
        )
    elif fk_score <= 12.0:
        status = "WARNING"
        reasoning = (
            f"Flesch-Kincaid grade is {fk_score:.1f} (10.0–12.0). "
            "Slightly complex; consider shorter sentences."
        )
    else:
        status = "FAIL"
        reasoning = (
            f"Flesch-Kincaid grade is {fk_score:.1f} (> 12.0). "
            "Too academic and hard to read."
        )

    return {
        "dimension": "Dimension 08: Readability",
        "status": status,
        "score": fk_score,
        "reasoning": reasoning,
    }


def merge_qa_with_readability(llm: "QAEvaluationResult", readability: dict) -> "QAEvaluationResult":
    """Merge Dimension 03 (LLM) and Dimension 08 (algorithm) for audit + UI."""
    from contracts import QAEvaluationResult

    merged_status = merge_compliance_status(
        llm.compliance_status,
        str(readability.get("status", "PASS")),
    )
    dim_label = str(readability.get("dimension", "Dimension 08: Readability"))
    algo_reason = str(readability.get("reasoning", ""))
    merged_reasoning = (
        f"[SEC / Compliance — Dimension 03]\n{llm.reasoning}\n\n"
        f"[Algorithm — {dim_label}]\n{algo_reason}"
    )
    return QAEvaluationResult(
        is_ui_description=llm.is_ui_description,
        reasoning=merged_reasoning,
        evidence_quote=llm.evidence_quote,
        compliance_status=merged_status,
        confidence_score=llm.confidence_score,
    )
