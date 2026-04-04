"""
fastapi application entry point with lifespan cors and uvicorn config
redis connection established on startup closed on shutdown
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import redis.asyncio as aioredis
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from src.api.routes import router

SCORE_WORKER_GROUP = "cg_score_worker"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    creates redis connection on startup stores in app state
    closes connection on shutdown
    """
    print("api startup connecting to redis")
    redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)

    try:
        await redis_client.ping()
        print("redis connected")
    except Exception as exc:
        print(f"redis ping failed {exc}")

    try:
        await redis_client.xgroup_create(
            settings.stream_score_requests,
            SCORE_WORKER_GROUP,
            id="0",
            mkstream=True,
        )
        print(f"consumer group {SCORE_WORKER_GROUP} ensured")
    except Exception as exc:
        if "BUSYGROUP" not in str(exc):
            print(f"xgroup create warning {exc}")

    app.state.redis = redis_client
    print("api startup complete")

    yield

    print("api shutdown closing redis")
    await redis_client.aclose()
    print("api shutdown complete")


app = FastAPI(
    title="msme credit scoring engine",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from src.api.auth import auth_router
from src.api.router_msme import router_msme
from src.api.router_bank import router_bank
from src.api.router_analyst import router_analyst
from src.api.router_admin import router_admin
from src.api.router_explorer import router_explorer

app.include_router(router)
app.include_router(auth_router)
app.include_router(router_msme)
app.include_router(router_bank)
app.include_router(router_analyst)
app.include_router(router_admin)
app.include_router(router_explorer)

if __name__ == "__main__":
    uvicorn.run(
        "src.api.main:app",
        host="0.0.0.0",
        port=8000,
        workers=settings.uvicorn_workers,
    )
