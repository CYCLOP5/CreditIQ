"""
pydantic v2 request and response schemas for credit scoring api
covers score submission status polling and health check payloads
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, field_validator


class ScoreRequest(BaseModel):
    """
    inbound score request validated gstin field
    strips whitespace uppercases before length and charset check
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    gstin: str

    @field_validator("gstin")
    @classmethod
    def validate_gstin(cls, v: str) -> str:
        """
        gstin must be exactly 15 ascii alphanumeric characters
        raises ValueError on length or charset violation
        """
        v = v.upper()
        if len(v) != 15:
            raise ValueError("gstin must be exactly 15 characters")
        if not v.isascii() or not v.isalnum():
            raise ValueError("gstin must contain only alphanumeric ascii characters")
        return v


class ScoreSubmitResponse(BaseModel):
    """
    202 accepted response body returned immediately on post score
    task_id is uuid4 string caller uses for polling
    """

    model_config = ConfigDict(frozen=True)

    task_id: str
    status: str = "pending"
    estimated_wait_seconds: int = 30


class ScoreResult(BaseModel):
    """
    complete scoring result returned when status equals complete
    all monetary amounts in indian rupees as integers
    top_reasons is five plain language strings from llm or shap fallback
    """

    model_config = ConfigDict(frozen=True)

    task_id: str
    gstin: str
    credit_score: int
    risk_band: str
    top_reasons: list[str]
    recommended_wc_amount: int
    recommended_term_amount: int
    msme_category: str
    cgtmse_eligible: bool
    mudra_eligible: bool
    fraud_flag: bool
    fraud_details: dict | None = None
    score_freshness: str
    data_maturity_months: int
    error: str | None = None


class HealthResponse(BaseModel):
    """
    system health snapshot returned by get health endpoint
    includes redis connectivity model file presence queue depth and ram
    """

    model_config = ConfigDict(frozen=True)

    status: str
    redis_connected: bool
    model_loaded: bool
    worker_queue_depth: int
    system_ram_used_gb: float
    system_ram_total_gb: float
