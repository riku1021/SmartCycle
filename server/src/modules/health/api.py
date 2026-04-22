"""health モジュールの簡易 API。"""

from fastapi import APIRouter
from pydantic import BaseModel

from src.infrastructure.config.settings import Settings, load_settings

from .service import HealthService

router = APIRouter()


class HealthResponseModel(BaseModel):
    status: str
    timestamp: str


def get_settings() -> Settings:
    return load_settings()


@router.get("/health")
async def health_check() -> HealthResponseModel:
    _ = get_settings()
    service = HealthService()
    result = await service.check()
    return HealthResponseModel(status=result.status, timestamp=result.timestamp)
