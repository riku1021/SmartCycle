"""example モジュールの簡易 API。"""

from fastapi import APIRouter
from pydantic import BaseModel

from .service import ExampleService

router = APIRouter()


class PingResponseModel(BaseModel):
    message: str


@router.get("/ping")
async def ping() -> PingResponseModel:
    service = ExampleService()
    result = await service.ping()
    return PingResponseModel(message=result.message)
