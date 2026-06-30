"""LINE Messaging API への送信（ブロードキャスト / プッシュ）."""

from __future__ import annotations

import math
import uuid

import httpx
from sqlalchemy import select

from src.infrastructure.config.settings import Settings
from src.infrastructure.db.models.parking_lot import ParkingLot
from src.infrastructure.db.session import get_session_maker
from src.infrastructure.logger.logger import logger
from src.modules.line.messages import build_few_spots_message, build_full_message

LINE_BROADCAST_URL = "https://api.line.me/v2/bot/message/broadcast"
LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push"


class LineNotifier:
    """駐輪場空き状況の変化に応じて LINE へ通知する."""

    def __init__(self, settings: Settings) -> None:
        self._token = settings.line_channel_access_token
        self._user_ids = settings.line_notify_user_ids
        self._use_broadcast = settings.line_use_broadcast

    @property
    def enabled(self) -> bool:
        if not self._token:
            return False
        if self._use_broadcast:
            return True
        return bool(self._user_ids)

    async def notify_status_change(
        self,
        parking_lot_id: uuid.UUID,
        previous_available: int | None,
        new_available: int,
        available_by_lot_id: dict[uuid.UUID, int],
    ) -> None:
        if not self.enabled:
            return
        if previous_available == new_available:
            return

        # 押下 1 台相当 (available=2) やそれ以上の空き: 通知なし
        if new_available >= 2:
            return

        session_maker = get_session_maker()
        async with session_maker() as session:
            lots_result = await session.execute(select(ParkingLot))
            lots = lots_result.scalars().all()

            lot = next((p_lot for p_lot in lots if p_lot.id == parking_lot_id), None)
            if lot is None:
                return

            message: str | None = None
            if new_available == 1 and previous_available != 1:
                message = build_few_spots_message(lot.name)
            elif new_available == 0 and previous_available != 0:
                # Calculate distances and recommend top 2
                def calc_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
                    return math.sqrt((lat1 - lat2) ** 2 + (lon1 - lon2) ** 2)

                candidates = []
                for other_lot in lots:
                    if other_lot.id == lot.id:
                        continue
                    available = available_by_lot_id.get(other_lot.id, other_lot.total_spots)
                    if available > 0:
                        dist = calc_distance(
                            lot.latitude, lot.longitude, other_lot.latitude, other_lot.longitude
                        )
                        candidates.append((dist, other_lot.name, available, other_lot.total_spots))

                candidates.sort(key=lambda x: x[0])  # Sort by distance
                top_recommendations = [(c[1], c[2], c[3]) for c in candidates[:2]]

                message = build_full_message(lot.name, top_recommendations)

            if message is None:
                return

        await self._send_text(message)

    async def _send_text(self, text: str) -> None:
        assert self._token is not None
        headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }
        messages = [{"type": "text", "text": text}]
        async with httpx.AsyncClient(timeout=10.0) as client:
            if self._use_broadcast:
                await self._post_messages(
                    client,
                    headers,
                    LINE_BROADCAST_URL,
                    {"messages": messages},
                    "ブロードキャスト（友だち全員）",
                )
                return
            for user_id in self._user_ids:
                await self._post_messages(
                    client,
                    headers,
                    LINE_PUSH_URL,
                    {"to": user_id, "messages": messages},
                    f"プッシュ (to={user_id})",
                )

    async def _post_messages(
        self,
        client: httpx.AsyncClient,
        headers: dict[str, str],
        url: str,
        payload: dict[str, object],
        label: str,
    ) -> None:
        try:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            logger.info("LINE 通知を送信しました (%s)", label)
        except httpx.HTTPStatusError as err:
            detail = err.response.text.strip() or err.response.reason_phrase
            if err.response.status_code == 401:
                logger.warning(
                    "LINE 通知の送信に失敗しました (%s): 401 Unauthorized — "
                    "LINE_CHANNEL_ACCESS_TOKEN が無効です。"
                    "チャネル ID / シークレットではなく「チャネルアクセストークン（長期）」を設定してください。"
                    " API 応答: %s",
                    label,
                    detail,
                )
            else:
                logger.warning(
                    "LINE 通知の送信に失敗しました (%s): HTTP %s — %s",
                    label,
                    err.response.status_code,
                    detail,
                )
        except httpx.HTTPError as err:
            logger.warning("LINE 通知の送信に失敗しました (%s): %s", label, err)
