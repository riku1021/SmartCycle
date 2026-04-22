"""GZip 圧縮ミドルウェア設定

レスポンスを自動的に圧縮して、転送サイズを削減し、パフォーマンスを向上させます。
"""

from fastapi import FastAPI
from starlette.middleware.gzip import GZipMiddleware

from ..logger.logger import logger


def setup_gzip(app: FastAPI) -> None:
    """GZip 圧縮ミドルウェアを設定

    レスポンスを自動的に圧縮して、転送サイズを削減し、パフォーマンスを向上させます。

    Args:
        app: FastAPI アプリケーション
    """
    app.add_middleware(
        GZipMiddleware,
        minimum_size=500,
    )
    logger.info("GZip 圧縮ミドルウェアを設定しました")
