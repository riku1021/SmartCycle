"""アプリケーション設定（Pydantic Settings 使用）

環境変数は .env ファイルから読み込まれ、検証されます。
envs/.env を読み込みます。

使用方法:
    envs/.env（なければ .env）を読み込みます。
"""

import os
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class ServerConfig(BaseSettings):
    """サーバー設定

    標準的なサーバー設定です。通常は変更不要です。
    """

    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8080, alias="PORT")
    read_timeout: int = Field(default=30, alias="READ_TIMEOUT")
    write_timeout: int = Field(default=30, alias="WRITE_TIMEOUT")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


# =============================================================================
# TODO: 以下にカスタム設定クラスを追加してください
# =============================================================================
#
# 例: 外部API設定
#
# class ExternalAPIConfig(BaseSettings):
#     """外部API設定"""
#
#     api_key: str = Field(alias="EXTERNAL_API_KEY")
#     base_url: str = Field(default="https://api.example.com", alias="EXTERNAL_API_URL")
#
#     model_config = SettingsConfigDict(
#         env_file=".env",
#         env_file_encoding="utf-8",
#         case_sensitive=False,
#         extra="ignore",
#     )
#
# 例: データベース設定
#
# class DatabaseConfig(BaseSettings):
#     """データベース設定"""
#
#     host: str = Field(alias="DB_HOST")
#     port: int = Field(default=5432, alias="DB_PORT")
#     name: str = Field(alias="DB_NAME")
#     user: str = Field(alias="DB_USER")
#     password: str = Field(alias="DB_PASSWORD")
#
#     model_config = SettingsConfigDict(
#         env_file=".env",
#         env_file_encoding="utf-8",
#         case_sensitive=False,
#         extra="ignore",
#     )
# =============================================================================


class Settings(BaseSettings):
    """アプリケーション設定

    環境変数から設定を読み込みます。
    アプリケーションに必要な設定値ごとにフィールドを追加してください。
    """

    # サーバー設定（標準 - 通常は変更不要）
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8080, alias="PORT")
    read_timeout: int = Field(default=30, alias="READ_TIMEOUT")
    write_timeout: int = Field(default=30, alias="WRITE_TIMEOUT")

    database_url: str = Field(
        ...,
        alias="DATABASE_URL",
        description="SQLAlchemy async URL (例: postgresql+asyncpg://...)",
    )
    jwt_secret: str = Field(
        ...,
        min_length=16,
        alias="JWT_SECRET",
    )
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(default=60 * 24, alias="JWT_EXPIRE_MINUTES")

    # 開発・検証用のテストアカウント (admin / dev / user) を起動時に冪等投入するか
    # 本番環境では必ず False のままにすること
    seed_dev_users: bool = Field(default=False, alias="SEED_DEV_USERS")

    model_config = SettingsConfigDict(
        env_file=None,  # load_settings()で動的に設定
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    def get_server_config(self) -> ServerConfig:
        """サーバー設定を取得

        Returns:
            サーバー設定
        """
        return ServerConfig.model_validate(
            {
                "HOST": self.host,
                "PORT": self.port,
                "READ_TIMEOUT": self.read_timeout,
                "WRITE_TIMEOUT": self.write_timeout,
            }
        )

    # ==========================================================================
    # TODO: カスタム設定用のゲッターメソッドを追加してください
    # ==========================================================================
    #
    # def get_external_api_config(self) -> ExternalAPIConfig:
    #     """外部API設定を取得"""
    #     return ExternalAPIConfig.model_validate({
    #         "EXTERNAL_API_KEY": self.external_api_key,
    #         "EXTERNAL_API_URL": self.external_api_url,
    #     })
    #
    # def get_database_config(self) -> DatabaseConfig:
    #     """データベース設定を取得"""
    #     return DatabaseConfig.model_validate({
    #         "DB_HOST": self.db_host,
    #         "DB_PORT": self.db_port,
    #         "DB_NAME": self.db_name,
    #         "DB_USER": self.db_user,
    #         "DB_PASSWORD": self.db_password,
    #     })
    # ==========================================================================


def get_env_file_path() -> list[str]:
    """読み込む.envファイルのパスを取得

    envs/.env を優先して読み込み、存在しない場合は .env を読み込みます。
    環境変数は Pydantic Settings の仕様に従って最優先で上書きされます。

    Returns:
        読み込む.envファイルのパスリスト
    """
    env_files = []

    if Path("envs/.env").exists():
        env_files.append("envs/.env")
    elif Path(".env").exists():
        env_files.append(".env")

    return env_files


def load_settings() -> Settings:
    """アプリケーション設定を読み込む

    envs/.env（なければ .env）を読み込みます。
    設定ファイルが見つからない場合は、必要な環境変数があるときのみ継続します。

    Returns:
        アプリケーション設定

    Raises:
        ValidationError: 必須の環境変数が設定されていない場合

    """
    env_files = get_env_file_path()

    if not env_files:
        required_env_keys = (
            "HOST",
            "PORT",
            "READ_TIMEOUT",
            "WRITE_TIMEOUT",
            "DATABASE_URL",
            "JWT_SECRET",
        )
        # SEED_DEV_USERS は任意設定 (デフォルト False) のため required には含めない
        missing_keys = [key for key in required_env_keys if key not in os.environ]
        if missing_keys:
            joined = ", ".join(missing_keys)
            raise RuntimeError(
                f"設定ファイル（envs/.env または .env）が見つからず、必要な環境変数も不足しています: {joined}"
            )

    # 環境固有の設定クラスを作成（env_fileを動的に設定）
    class EnvironmentSettings(Settings):
        model_config = SettingsConfigDict(
            env_file=env_files if env_files else None,
            env_file_encoding="utf-8",
            case_sensitive=False,
        )

    settings = EnvironmentSettings()  # type: ignore[call-arg]

    # ログに読み込んだファイルを記録
    from ...infrastructure.logger.logger import logger

    if env_files:
        logger.info(f"読み込んだ設定ファイル: {', '.join(env_files)}")

    return settings
