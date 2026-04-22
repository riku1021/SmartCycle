"""アプリケーションのルーター集約ポイント。

modules.<context>.adapters.http などからルーターを集約し、FastAPI アプリに登録
"""

from fastapi import FastAPI

from src.modules.example.api import router as example_router
from src.modules.health.api import router as health_router


def include_routers(app: FastAPI) -> None:
    """FastAPI アプリケーションにルーターを登録"""
    app.include_router(example_router)
    app.include_router(health_router)
