"""アプリケーションのログ設定

アプリケーション全体でインポートして使用できる
集中管理されたロガーを提供します。
"""

import logging
import sys


def setup_logger(name: str | None = None, level: int = logging.INFO) -> logging.Logger:
    """アプリケーションロガーをセットアップ

    Args:
        name: ロガー名（デフォルトはルートロガー）
        level: ログレベル

    Returns:
        設定済みのロガーインスタンス
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # コンソールハンドラーを作成
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)

    # フォーマッターを作成
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    # ハンドラーをロガーに追加
    if not logger.handlers:
        logger.addHandler(handler)

    return logger


# デフォルトのロガーインスタンス
logger = setup_logger()
