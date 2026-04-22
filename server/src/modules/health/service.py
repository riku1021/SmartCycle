"""health モジュールの簡易サービス。"""

from dataclasses import dataclass
from datetime import UTC, datetime


@dataclass(frozen=True)
class HealthStatus:
    """ヘルスチェック結果。"""

    status: str
    timestamp: str


class HealthService:
    """ヘルスチェックの最小ロジック。"""

    async def check(self) -> HealthStatus:
        return HealthStatus(
            status="healthy",
            timestamp=datetime.now(UTC).isoformat(),
        )
