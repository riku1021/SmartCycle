"""ロギングミドルウェア設定

すべての HTTP リクエストとレスポンスをログに記録します。
"""

from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response

from ..logger.logger import logger


def setup_logging_middleware(app: FastAPI) -> None:
    """ロギングミドルウェアを設定

    すべての HTTP リクエストとレスポンスをログに記録します。

    Args:
        app: FastAPI アプリケーション
    """

    @app.middleware("http")
    async def log_requests(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        """すべての HTTP リクエストをログに記録"""
        logger.info(f"{request.method} {request.url.path}")
        response = await call_next(request)
        logger.info(f"{request.method} {request.url.path} - {response.status_code}")
        return response

    logger.info("ロギングミドルウェアを設定しました")
