"""共通エラー定義。

アプリケーション全体で使用される基底エラークラスを定義します。
"""


class AppError(Exception):
    """アプリケーションエラーの基底クラス。"""

    def __init__(
        self, message: str = "エラーが発生しました", error_code: str = "APP_ERROR"
    ) -> None:
        self.message = message
        self.error_code = error_code
        super().__init__(message)


class ValidationError(AppError):
    """入力検証エラー。"""

    def __init__(
        self, message: str = "検証に失敗しました", error_code: str = "VALIDATION_ERROR"
    ) -> None:
        super().__init__(message, error_code)


class NotFoundError(AppError):
    """リソース未検出エラー。"""

    def __init__(
        self, message: str = "リソースが見つかりません", error_code: str = "NOT_FOUND"
    ) -> None:
        super().__init__(message, error_code)


class ConflictError(AppError):
    """競合エラー。"""

    def __init__(
        self, message: str = "リソースが競合しています", error_code: str = "CONFLICT"
    ) -> None:
        super().__init__(message, error_code)


class OperationError(AppError):
    """操作失敗エラー。"""

    def __init__(
        self, message: str = "操作に失敗しました", error_code: str = "OPERATION_ERROR"
    ) -> None:
        super().__init__(message, error_code)


class UnauthorizedError(AppError):
    """認証エラー。"""

    def __init__(self, message: str = "認証が必要です", error_code: str = "UNAUTHORIZED") -> None:
        super().__init__(message, error_code)


class ForbiddenError(AppError):
    """権限エラー。"""

    def __init__(
        self, message: str = "アクセス権限がありません", error_code: str = "FORBIDDEN"
    ) -> None:
        super().__init__(message, error_code)


__all__ = [
    "AppError",
    "ValidationError",
    "NotFoundError",
    "ConflictError",
    "OperationError",
    "UnauthorizedError",
    "ForbiddenError",
]
