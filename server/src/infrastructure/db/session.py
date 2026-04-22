from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

_async_engine: AsyncEngine | None = None
_async_session_maker: async_sessionmaker[AsyncSession] | None = None


def init_db(database_url: str) -> None:
    """非同期 SQLAlchemy エンジンを初期化する（アプリ起動時に1回）。"""
    global _async_engine, _async_session_maker
    if _async_engine is not None:
        return
    _async_engine = create_async_engine(
        database_url,
        echo=False,
        pool_pre_ping=True,
    )
    _async_session_maker = async_sessionmaker(
        _async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


async def close_db() -> None:
    """接続を解放する（シャットダウン時）。"""
    global _async_engine, _async_session_maker
    if _async_engine is not None:
        await _async_engine.dispose()
        _async_engine = None
    _async_session_maker = None


def get_session_maker() -> async_sessionmaker[AsyncSession]:
    if _async_session_maker is None:
        msg = "init_db() を先に呼び出してください"
        raise RuntimeError(msg)
    return _async_session_maker


async def get_db() -> AsyncGenerator[AsyncSession]:
    """リクエストごとの AsyncSession を提供する（成功時に commit）。"""
    session_maker = get_session_maker()
    async with session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
