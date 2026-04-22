"""FastAPI 用の共有依存（設定など）。"""

from .settings import Settings, load_settings


def get_settings() -> Settings:
    return load_settings()
