"""
fastapi route handlers for credit scoring api
post score get score task_id get health
redis interaction via app state connection shared across requests
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

import psutil
import redis.asyncio as aioredis
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from config.settings import settings
from src.api.schemas import HealthResponse, ScoreRequest, ScoreResult, ScoreSubmitResponse

router = APIRouter()


@router.post("/score", status_code=202)
async def submit_score(request: Request, body: ScoreRequest) -> JSONResponse:
    """
    validates gstin creates task pushes to redis stream returns 202
    creates score hash with pending status created_at timestamp
    """
    task_id = str(uuid.uuid4())
    redis_client: aioredis.Redis = request.app.state.redis
    created_at = datetime.now(timezone.utc).isoformat()

    await redis_client.xadd(
        settings.stream_score_requests,
        {"task_id": task_id, "gstin": body.gstin},
        maxlen=settings.stream_maxlen,
        approximate=True,
    )

    await redis_client.hset(
        f"score:{task_id}",
        mapping={
            "status": "pending",
            "gstin": body.gstin,
            "created_at": created_at,
        },
    )

    print(f"score task submitted task_id={task_id} gstin={body.gstin}")

    return JSONResponse(
        status_code=202,
        content=ScoreSubmitResponse(task_id=task_id).model_dump(),
    )


@router.get("/score/{task_id}")
async def get_score(request: Request, task_id: str) -> JSONResponse:
    """
    reads score hash from redis and returns appropriate payload
    pending returns minimal status only complete returns full score result
    failed returns task_id status and error string
    """
    redis_client: aioredis.Redis = request.app.state.redis
    data: dict = await redis_client.hgetall(f"score:{task_id}")

    if not data:
        raise HTTPException(status_code=404, detail="task not found")

    status = data.get("status", "pending")

    if status == "pending" or status == "processing":
        return JSONResponse(
            status_code=200,
            content={"task_id": task_id, "status": status},
        )

    if status == "failed":
        return JSONResponse(
            status_code=200,
            content={
                "task_id": task_id,
                "status": "failed",
                "error": data.get("error", "unknown error"),
            },
        )

    result = ScoreResult(
        task_id=task_id,
        gstin=data.get("gstin", ""),
        credit_score=int(data.get("credit_score", 0)),
        risk_band=data.get("risk_band", ""),
        top_reasons=json.loads(data.get("top_reasons", "[]")),
        recommended_wc_amount=int(data.get("recommended_wc_amount", 0)),
        recommended_term_amount=int(data.get("recommended_term_amount", 0)),
        msme_category=data.get("msme_category", "micro"),
        cgtmse_eligible=data.get("cgtmse_eligible", "false") == "true",
        mudra_eligible=data.get("mudra_eligible", "false") == "true",
        fraud_flag=data.get("fraud_flag", "false") == "true",
        fraud_details=json.loads(data.get("fraud_details", "null")),
        score_freshness=data.get("score_freshness", ""),
        data_maturity_months=int(data.get("data_maturity_months", 0)),
    )

    return JSONResponse(status_code=200, content=result.model_dump())


@router.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    """
    returns redis connectivity model file presence queue depth and system ram
    never raises catches all redis errors and reports redis_connected false
    """
    redis_client: aioredis.Redis = request.app.state.redis
    redis_connected = False
    worker_queue_depth = 0

    try:
        await redis_client.ping()
        redis_connected = True
        worker_queue_depth = int(await redis_client.xlen(settings.stream_score_requests))
    except Exception:
        redis_connected = False

    model_loaded = Path(settings.xgb_model_path).exists()

    mem = psutil.virtual_memory()
    ram_used_gb = round(mem.used / (1024 ** 3), 2)
    ram_total_gb = round(mem.total / (1024 ** 3), 2)

    return HealthResponse(
        status="ok",
        redis_connected=redis_connected,
        model_loaded=model_loaded,
        worker_queue_depth=worker_queue_depth,
        system_ram_used_gb=ram_used_gb,
        system_ram_total_gb=ram_total_gb,
    )

from sse_starlette.sse import EventSourceResponse
from src.api.schemas import ChatRequest
from src.llm.translator import get_model_path
from llama_cpp import Llama
from typing import AsyncGenerator
import json

_chat_llm_instance = None

def get_chat_llm():
    """
    lazy loads phi-3-mini locally for chat inference
    cpu-only n_gpu_layers=0 limits memory consumption
    """
    global _chat_llm_instance
    if _chat_llm_instance is None:
        print("loading chat llm lazily on cpu")
        _chat_llm_instance = Llama(
            model_path=str(get_model_path()),
            n_gpu_layers=0,
            n_ctx=2048,
            n_threads=4,
            verbose=False,
        )
    return _chat_llm_instance

@router.get("/score/{task_id}/stream")
async def stream_score_progress(request: Request, task_id: str) -> EventSourceResponse:
    """
    server sent events endpoint streams redis pub sub messages
    replaces polling for score status showing realtime updates
    """
    redis_client: aioredis.Redis = request.app.state.redis
    
    async def event_generator() -> AsyncGenerator[dict, None]:
        pubsub = redis_client.pubsub()
        await pubsub.subscribe(f"updates:{task_id}")
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data_str = message["data"].decode("utf-8")
                    yield {"data": data_str}
                    if "complete" in data_str or "failed" in data_str:
                        break
        finally:
            await pubsub.unsubscribe(f"updates:{task_id}")
            await pubsub.close()
            
    return EventSourceResponse(event_generator())

@router.post("/score/{task_id}/chat")
async def chat_with_score(request: Request, task_id: str, body: ChatRequest):
    """
    interactive credit analyst genai chat feature
    retrieves cached score and streams inferences directly
    """
    redis_client: aioredis.Redis = request.app.state.redis
    data = await redis_client.hgetall(f"score:{task_id}")
    
    if not data or data.get("status") not in ("complete", "failed"):
        raise HTTPException(status_code=400, detail="score not ready for chat")
        
    prompt = f"""<|system|>You are an AI Credit Analyst using only this MSME data:
Score: {data.get('credit_score', 'N/A')}
Risk Band: {data.get('risk_band', 'N/A')}
Fraud Flag: {data.get('fraud_flag', 'false')}
Top Reasons: {data.get('top_reasons', '[]')}
Fraud Details: {data.get('fraud_details', 'null')}
<|end|>
<|user|>
{body.query}
<|end|>
<|assistant|>"""

    llm = get_chat_llm()
    
    def stream_generator():
        for chunk in llm(prompt, max_tokens=512, stop=["<|end|>", "<|user|>"], stream=True):
            yield chunk["choices"][0]["text"]
            
    return EventSourceResponse(stream_generator())
