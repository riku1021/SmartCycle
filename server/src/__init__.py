"""FastAPI サーバーアプリケーション。

簡素化後の主要ディレクトリ構造:
- bootstrap/: アプリ全体の組み立て（FastAPI, ルーター集約）
- modules/: モジュール単位の定義（api / service）
- shared/: 共通エラーと HTTP 例外ハンドラー
- infrastructure/: 設定・ロギング・ミドルウェアなど技術基盤
"""
