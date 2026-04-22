"""FastAPI アプリケーション組み立てロジック。

bootstrap レイヤとして、アプリケーションの生成・ミドルウェア登録・
ルーター登録・例外ハンドラー登録などの Imperative Shell をここに集約します。
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel

from src.infrastructure.config.settings import load_settings
from src.infrastructure.db.session import close_db, init_db
from src.infrastructure.http import setup_exception_handlers
from src.infrastructure.logger.logger import logger
from src.infrastructure.middleware import setup_middleware

from .router_registry import include_routers


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    """アプリケーションライフサイクルコンテキストマネージャー

    起動とシャットダウンイベントを処理します。
    """
    # 起動
    logger.info("FastAPI アプリケーションを起動しています...")

    # 設定を読み込み
    settings = load_settings()
    logger.info(f"サーバー設定: host={settings.host}, port={settings.port}")
    init_db(settings.database_url)
    logger.info("データベース接続を初期化しました")

    try:
        yield
    finally:
        # シャットダウン
        logger.info("FastAPI アプリケーションをシャットダウンしています...")
        await close_db()
        logger.info("データベース接続を解放しました")
        logger.info("シャットダウン処理が完了しました")


def create_app() -> FastAPI:
    """FastAPI アプリケーションを生成

    Returns:
        構成済みの FastAPI アプリケーション
    """
    app = FastAPI(
        title="SmartCycle API Server",
        version="0.1.0",
        lifespan=lifespan,
    )

    # ミドルウェアの設定
    setup_middleware(app)

    # グローバル例外ハンドラーの登録
    setup_exception_handlers(app)

    # 各ハンドラー（現状は adapter/http 配下）からルーターを集約
    include_routers(app)

    # テスト用エンドポイント（テンプレート用の簡易ヘルスチェック）
    class TestResponseModel(BaseModel):
        message: str

    @app.get("/test")
    async def test() -> TestResponseModel:
        return TestResponseModel(message="Hello World")

    return app
