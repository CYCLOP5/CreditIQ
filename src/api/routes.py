from __future__ import annotations

import json
import uuid

import psutil
import redis.asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from config.settings import settings
from src.api.schemas import HealthResponse, ScoreRequest, ScoreResponse, TaskStatusResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    ram_used_mb = psutil.virtual_memory().used / 1024 / 1024
    vram_used_mb = 0.0
    redis_connected = False
    try:
        client = redis.asyncio.from_url(settings.redis_url)
        await client.ping()
        redis_connected = True
        await client.aclose()
    except Exception:
        redis_connected = False
    return HealthResponse(
        status="ok",
        redis_connected=redis_connected,
        model_loaded=False,
        ram_used_mb=ram_used_mb,
        vram_used_mb=vram_used_mb,
    )


@router.post("/score", status_code=202)
async def submit_score(request: ScoreRequest) -> JSONResponse:
    task_id = str(uuid.uuid4())
    client = redis.asyncio.from_url(settings.redis_url)
    await client.xadd(
        settings.stream_score_requests,
        {"task_id": task_id, "gstin": request.gstin},
        maxlen=settings.stream_maxlen,
    )
    await client.hset(f"score:{task_id}", mapping={"status": "pending", "gstin": request.gstin})
    await client.aclose()
    return JSONResponse(
        status_code=202,
        content={"task_id": task_id, "status": "pending", "estimated_wait_seconds": 10},
    )


@router.get("/score/{task_id}", response_model=TaskStatusResponse)
async def get_score(task_id: str) -> TaskStatusResponse:
    client = redis.asyncio.from_url(settings.redis_url)
    data = await client.hgetall(f"score:{task_id}")
    await client.aclose()
    if not data:
        raise HTTPException(status_code=404, detail="task not found")
    status = data.get(b"status", b"pending").decode()
    if status == "pending":
        return TaskStatusResponse(task_id=task_id, status="pending")
    if status == "complete":
        raw = data.get(b"result", b"{}").decode()
        result = ScoreResponse(**json.loads(raw))
        return TaskStatusResponse(task_id=task_id, status="complete", result=result)
    error_msg = data.get(b"error", b"unknown error").decode()
    return TaskStatusResponse(task_id=task_id, status="failed", error=error_msg)
