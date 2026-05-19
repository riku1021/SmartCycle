"""LINE 設定の簡易チェック."""

from src.infrastructure.config.settings import Settings
from src.infrastructure.logger.logger import logger

# 長期チャネルアクセストークンはおおむね 100 文字以上の英数字・記号
_MIN_TOKEN_LENGTH = 50


def line_token_looks_valid(token: str | None) -> bool:
    if not token or not token.strip():
        return False
    stripped = token.strip()
    if len(stripped) < _MIN_TOKEN_LENGTH:
        return False
    # チャネル ID のみ（数字だけで短い）を弾く
    return not (stripped.isdigit() and len(stripped) < 20)


def warn_if_line_misconfigured(settings: Settings) -> None:
    token = settings.line_channel_access_token
    if not token:
        return
    if line_token_looks_valid(token):
        return
    logger.warning(
        "LINE_CHANNEL_ACCESS_TOKEN の形式が不正です。"
        "チャネル ID やチャネルシークレットではなく、"
        "LINE Developers > 対象チャネル > Messaging API タブの"
        "「チャネルアクセストークン（長期）」を発行して設定してください。"
        "（現在の値は %d 文字）",
        len(token.strip()),
    )
