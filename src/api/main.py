from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import uvicorn
from fastapi import FastAPI

from config.settings import settings
from src.api.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    print("fastapi startup complete")
    yield
    print("fastapi shutdown complete")


app = FastAPI(title="credit scoring engine", version="0.1.0", lifespan=lifespan)

app.include_router(router)

if __name__ == "__main__":
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=8000, workers=settings.uvicorn_workers)
