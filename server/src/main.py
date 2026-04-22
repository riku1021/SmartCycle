"""FastAPI アプリケーションエントリーポイント。

アプリケーション本体の組み立ては src.bootstrap.app_builder に委譲し、
このモジュールは WSGI/ASGI サーバーから参照される薄いエントリポイントとしてのみ振る舞います。
"""

import uvicorn

from src.bootstrap.app_builder import create_app
from src.infrastructure.config.settings import load_settings

# =============================================================================
# FastAPI アプリケーションを作成
# =============================================================================
app = create_app()


if __name__ == "__main__":
    # サーバー設定を読み込み
    settings = load_settings()

    # uvicorn でサーバーを起動
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,  # 開発環境用にホットリロードを有効化
        log_level="info",
    )
