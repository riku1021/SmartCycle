"""グローバル例外ハンドラー（infrastructure/http）。"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError

from src.infrastructure.logger.logger import logger
from src.shared.errors import (
    AppError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    OperationError,
    UnauthorizedError,
    ValidationError,
)


def setup_exception_handlers(app: FastAPI) -> None:
    """FastAPI アプリケーションに例外ハンドラーを登録。"""

    @app.exception_handler(ValidationError)
    async def validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:
        logger.warning(f"Validation error: {exc.message} - {request.url.path}")
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "type": "validation_error",
                }
            },
        )

    @app.exception_handler(NotFoundError)
    async def not_found_error_handler(request: Request, exc: NotFoundError) -> JSONResponse:
        logger.warning(f"Not found: {exc.message} - {request.url.path}")
        return JSONResponse(
            status_code=404,
            content={
                "error": {"code": exc.error_code, "message": exc.message, "type": "not_found"}
            },
        )

    @app.exception_handler(ConflictError)
    async def conflict_error_handler(request: Request, exc: ConflictError) -> JSONResponse:
        logger.warning(f"Conflict: {exc.message} - {request.url.path}")
        return JSONResponse(
            status_code=409,
            content={"error": {"code": exc.error_code, "message": exc.message, "type": "conflict"}},
        )

    @app.exception_handler(UnauthorizedError)
    async def unauthorized_error_handler(request: Request, exc: UnauthorizedError) -> JSONResponse:
        logger.warning(f"Unauthorized: {exc.message} - {request.url.path}")
        return JSONResponse(
            status_code=401,
            content={
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "type": "unauthorized",
                }
            },
        )

    @app.exception_handler(ForbiddenError)
    async def forbidden_error_handler(request: Request, exc: ForbiddenError) -> JSONResponse:
        logger.warning(f"Forbidden: {exc.message} - {request.url.path}")
        return JSONResponse(
            status_code=403,
            content={
                "error": {"code": exc.error_code, "message": exc.message, "type": "forbidden"}
            },
        )

    @app.exception_handler(OperationError)
    async def operation_error_handler(request: Request, exc: OperationError) -> JSONResponse:
        logger.error(f"Operation error: {exc.message} - {request.url.path}")
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "type": "operation_error",
                }
            },
        )

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        logger.warning(f"App error: {exc.message} - {request.url.path}")
        return JSONResponse(
            status_code=400,
            content={
                "error": {"code": exc.error_code, "message": exc.message, "type": "app_error"}
            },
        )

    @app.exception_handler(PydanticValidationError)
    async def pydantic_validation_error_handler(
        request: Request, exc: PydanticValidationError
    ) -> JSONResponse:
        logger.warning(f"Pydantic validation error: {exc.errors()} - {request.url.path}")
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "リクエストデータの検証に失敗しました",
                    "type": "validation_error",
                    "details": exc.errors(),
                }
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(f"Unexpected error: {exc} - {request.url.path}")
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "内部サーバーエラーが発生しました",
                    "type": "internal_error",
                }
            },
        )

    logger.info("例外ハンドラーを登録しました")
