"""ミドルウェア設定モジュール

アプリケーション全体で使用されるミドルウェアを提供します。
技術的な関心事（infrastructure層）として管理されます。
"""

from .setup import setup_middleware

__all__ = ["setup_middleware"]
