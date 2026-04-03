from __future__ import annotations

from pydantic import BaseModel, Field


class ScoreRequest(BaseModel):
    gstin: str = Field(
        pattern=r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
    )


class LoanRecommendation(BaseModel):
    amount_inr: int
    tenure_months: int


class ScoreResponse(BaseModel):
    task_id: str
    gstin: str
    credit_score: int
    risk_band: str
    top_reasons: list[str]
    recommended_loan: LoanRecommendation | None
    fraud_flag: bool
    fraud_details: str | None
    score_freshness: str
    data_maturity_months: int


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: ScoreResponse | None = None
    error: str | None = None


class HealthResponse(BaseModel):
    status: str
    redis_connected: bool
    model_loaded: bool
    ram_used_mb: float
    vram_used_mb: float
