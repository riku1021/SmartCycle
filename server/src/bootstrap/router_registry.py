"""アプリケーションのルーター集約。

`modules` 各パッジの `api` ルーターを FastAPI アプリに登録する。
"""

from fastapi import FastAPI

from src.modules.auth.api import router as auth_router
from src.modules.example.api import router as example_router
from src.modules.health.api import router as health_router


def include_routers(app: FastAPI) -> None:
    """FastAPI アプリケーションにルーターを登録"""
    app.include_router(auth_router)
    app.include_router(example_router)
    app.include_router(health_router)
