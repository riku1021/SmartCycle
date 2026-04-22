"""example モジュールの簡易サービス。"""

from dataclasses import dataclass


@dataclass(frozen=True)
class PingResult:
    message: str


class ExampleService:
    """example の最小ロジック。"""

    async def ping(self) -> PingResult:
        return PingResult(message="バックエンドからの応答です")
