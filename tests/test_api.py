"""
integration tests for credit scoring api endpoints
uses httpx asyncclient with asgi transport and real redis connection
redis client injected directly into app.state bypassing lifespan
asgi transport does not fire lifespan events so state is set explicitly
"""

from __future__ import annotations

import json as _json
import uuid

import httpx
import pytest
import redis.asyncio as aioredis

from config.settings import settings
from src.api.main import app

VALID_GSTIN = "22AAAAA0000A1Z5"


@pytest.fixture
async def real_redis() -> aioredis.Redis:
    """
    creates real aioredis client and injects it directly into app.state.redis
    bypasses lifespan because httpx asgi transport does not send lifespan events
    cleans up state key and closes connection after each test
    """
    r = aioredis.from_url(settings.redis_url, decode_responses=True)
    app.state.redis = r
    yield r
    await r.aclose()
    del app.state._state["redis"]


async def test_health_returns_200(real_redis: aioredis.Redis) -> None:
    """
    get health returns 200 with expected json keys
    redis_connected true when real redis is reachable
    """
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


async def test_submit_score_returns_202_for_valid_gstin(real_redis: aioredis.Redis) -> None:
    """
    post score with valid 15-char alphanumeric gstin returns 202 accepted
    response body contains task_id status and estimated_wait_seconds
    cleans up score hash and stream after assertion
    """
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

    await real_redis.delete(f"score:{data['task_id']}")


async def test_submit_score_rejects_invalid_gstin(real_redis: aioredis.Redis) -> None:
    """
    post score with gstin shorter than 15 chars returns 422 unprocessable entity
    validation fires before route body executes so no redis interaction
    """
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/score", json={"gstin": "TOOSHORT"})

    assert response.status_code == 422


async def test_get_score_nonexistent_task_returns_404(real_redis: aioredis.Redis) -> None:
    """
    get score for unknown task_id returns 404 not found
    uses a freshly generated uuid guaranteed not to exist in redis
    """
    nonexistent_id = str(uuid.uuid4())

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get(f"/score/{nonexistent_id}")

    assert response.status_code == 404
    data = response.json()
    assert "task not found" in data.get("detail", "").lower()


async def test_get_score_pending_task_returns_200_pending(real_redis: aioredis.Redis) -> None:
    """
    get score for pending task returns 200 with status pending
    seeds score hash directly into redis then cleans up in finally block
    """
    task_id = str(uuid.uuid4())
    await real_redis.hset(
        f"score:{task_id}",
        mapping={
            "status": "pending",
            "gstin": VALID_GSTIN,
            "created_at": "2026-04-03T12:00:00+00:00",
        },
    )

    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.get(f"/score/{task_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"
        assert data["task_id"] == task_id
    finally:
        await real_redis.delete(f"score:{task_id}")


async def test_get_score_complete_task_returns_full_result(real_redis: aioredis.Redis) -> None:
    """
    get score for complete task returns 200 with full score result payload
    all expected fields present and correctly typed in response
    seeds complete score hash directly into redis then cleans up in finally block
    """
    task_id = str(uuid.uuid4())
    await real_redis.hset(
        f"score:{task_id}",
        mapping={
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
        },
    )

    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.get(f"/score/{task_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == task_id
        assert data["credit_score"] == 723
        assert data["risk_band"] == "low_risk"
        assert len(data["top_reasons"]) == 5
        assert data["cgtmse_eligible"] is True
        assert data["mudra_eligible"] is False
        assert data["fraud_flag"] is False
        assert data["msme_category"] == "small"
    finally:
        await real_redis.delete(f"score:{task_id}")
