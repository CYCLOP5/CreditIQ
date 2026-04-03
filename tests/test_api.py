"""
integration tests for credit scoring api endpoints
uses httpx asyncclient with asgi transport and mocked redis
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from src.api.main import app

VALID_GSTIN = "22AAAAA0000A1Z5"
FAKE_TASK_ID = "00000000-0000-0000-0000-000000000001"


@pytest.fixture
def mock_redis() -> AsyncMock:
    """
    returns async mock redis client with all methods used by api routes and lifespan
    xgroup_create raises busygroup to simulate already-existing consumer group
    hgetall returns empty dict by default representing missing task hash
    """
    r = AsyncMock()
    r.ping.return_value = True
    r.xgroup_create.side_effect = Exception("BUSYGROUP Consumer Group name already exists")
    r.xlen.return_value = 7
    r.xadd.return_value = "1688000000000-0"
    r.hset.return_value = 1
    r.hgetall.return_value = {}
    r.aclose.return_value = None
    return r


async def test_health_returns_200(mock_redis: AsyncMock) -> None:
    """
    get health returns 200 with expected json keys
    redis_connected true when mock ping succeeds
    """
    with patch("src.api.main.aioredis.from_url", return_value=mock_redis):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["redis_connected"] is True
    assert isinstance(data["model_loaded"], bool)
    assert isinstance(data["worker_queue_depth"], int)
    assert isinstance(data["system_ram_used_gb"], float)
    assert isinstance(data["system_ram_total_gb"], float)


async def test_submit_score_returns_202_for_valid_gstin(mock_redis: AsyncMock) -> None:
    """
    post score with valid 15-char alphanumeric gstin returns 202 accepted
    response body contains task_id status and estimated_wait_seconds
    """
    with patch("src.api.main.aioredis.from_url", return_value=mock_redis):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.post("/score", json={"gstin": VALID_GSTIN})

    assert response.status_code == 202
    data = response.json()
    assert "task_id" in data
    assert data["status"] == "pending"
    assert isinstance(data["estimated_wait_seconds"], int)
    assert len(data["task_id"]) == 36


async def test_submit_score_rejects_invalid_gstin(mock_redis: AsyncMock) -> None:
    """
    post score with gstin shorter than 15 chars returns 422 unprocessable entity
    """
    with patch("src.api.main.aioredis.from_url", return_value=mock_redis):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.post("/score", json={"gstin": "TOOSHORT"})

    assert response.status_code == 422


async def test_get_score_nonexistent_task_returns_404(mock_redis: AsyncMock) -> None:
    """
    get score for unknown task_id returns 404 not found
    hgetall returns empty dict simulating missing redis hash
    """
    mock_redis.hgetall.return_value = {}

    with patch("src.api.main.aioredis.from_url", return_value=mock_redis):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.get(f"/score/{FAKE_TASK_ID}")

    assert response.status_code == 404
    data = response.json()
    assert "task not found" in data.get("detail", "").lower()


async def test_get_score_pending_task_returns_200_pending(mock_redis: AsyncMock) -> None:
    """
    get score for pending task returns 200 with status pending
    hgetall returns hash with status=pending
    """
    mock_redis.hgetall.return_value = {
        "status": "pending",
        "gstin": VALID_GSTIN,
        "created_at": "2026-04-03T12:00:00+00:00",
    }

    with patch("src.api.main.aioredis.from_url", return_value=mock_redis):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.get(f"/score/{FAKE_TASK_ID}")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "pending"
    assert data["task_id"] == FAKE_TASK_ID


async def test_get_score_complete_task_returns_full_result(mock_redis: AsyncMock) -> None:
    """
    get score for complete task returns 200 with full score result payload
    all expected fields present in response
    """
    import json as _json

    mock_redis.hgetall.return_value = {
        "status": "complete",
        "gstin": VALID_GSTIN,
        "credit_score": "723",
        "risk_band": "low_risk",
        "top_reasons": _json.dumps(["r1", "r2", "r3", "r4", "r5"]),
        "recommended_wc_amount": "2500000",
        "recommended_term_amount": "5000000",
        "msme_category": "small",
        "cgtmse_eligible": "true",
        "mudra_eligible": "false",
        "fraud_flag": "false",
        "fraud_details": "null",
        "score_freshness": "2026-04-03T13:12:45+05:30",
        "data_maturity_months": "8",
    }

    with patch("src.api.main.aioredis.from_url", return_value=mock_redis):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.get(f"/score/{FAKE_TASK_ID}")

    assert response.status_code == 200
    data = response.json()
    assert data["task_id"] == FAKE_TASK_ID
    assert data["credit_score"] == 723
    assert data["risk_band"] == "low_risk"
    assert len(data["top_reasons"]) == 5
    assert data["cgtmse_eligible"] is True
    assert data["mudra_eligible"] is False
    assert data["fraud_flag"] is False
    assert data["msme_category"] == "small"
