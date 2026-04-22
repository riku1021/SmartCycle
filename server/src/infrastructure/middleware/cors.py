"""CORS ミドルウェア設定

クロスオリジンリソース共有（CORS）を処理するミドルウェアを設定します。
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ..logger.logger import logger


def setup_cors(app: FastAPI) -> None:
    """CORS ミドルウェアを設定

    本番環境に合わせてこの設定を調整してください。

    Args:
        app: FastAPI アプリケーション
    """
    # TODO: 本番環境用に CORS 設定を調整
    # - "*" の代わりに許可するオリジンを指定
    # - 必要に応じて他のセキュリティ設定を構成
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # すべてのオリジンを許可（本番環境では調整が必要）
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.info("CORS ミドルウェアを設定しました")
