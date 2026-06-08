"""アプリケーションのルーター集約。

`modules` 各パッジの `api` ルーターを FastAPI アプリに登録する。
"""

from fastapi import FastAPI

from src.modules.auth.api import router as auth_router
from src.modules.example.api import router as example_router
from src.modules.gate_camera.api import router as gate_camera_router
from src.modules.health.api import router as health_router
from src.modules.iot.api import router as iot_router
from src.modules.overhead_camera.api import router as overhead_camera_router
from src.modules.parking_lots.api import router as parking_lots_router
from src.modules.reservations.api import router as reservations_router


def include_routers(app: FastAPI) -> None:
    """FastAPI アプリケーションにルーターを登録"""
    app.include_router(auth_router)
    app.include_router(gate_camera_router)
    app.include_router(overhead_camera_router)
    app.include_router(example_router)
    app.include_router(health_router)
    app.include_router(iot_router)
    app.include_router(parking_lots_router)
    app.include_router(reservations_router)
