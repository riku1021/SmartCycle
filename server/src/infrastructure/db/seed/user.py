"""開発・検証用のテストアカウントを冪等に投入するシード処理。

クライアント側 (client/src/lib/adminRole.ts) のロール判定で参照される
3 アカウント (admin / dev / user) を、新規 DB でも `docker compose up` 直後から
ログインできるように初期投入する。

冪等性:
- 既に同じメールアドレスのユーザーが存在する場合はスキップする。
- 失敗時は呼び出し側にロールバックを委ねる。
"""

from dataclasses import dataclass

from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.infrastructure.db.models.user import User
from src.infrastructure.logger.logger import logger

_pwd = PasswordHash.recommended()


@dataclass(frozen=True)
class _SeedUser:
    email: str
    password: str
    name: str


# クライアント側 (client/src/lib/adminRole.ts) と同じ値を使用する。
# パスワードを変更する場合はクライアント側および docs/test-accounts.md も同時に更新する。
_SEED_USERS: tuple[_SeedUser, ...] = (
    _SeedUser(email="admin@mail.com", password="admin1234", name="管理者ユーザー"),
    _SeedUser(email="dev@mail.com", password="dev1234", name="開発者ユーザー"),
    _SeedUser(email="user@mail.com", password="user1234", name="一般ユーザー"),
)


async def seed_dev_users(session_maker: async_sessionmaker[AsyncSession]) -> None:
    """テスト用アカウントを冪等に投入する。

    - 既存の同 email レコードがあればスキップ
    - 1 件でも追加した場合は commit
    - ハッシュ計算は pwdlib (argon2) を使用
    """
    async with session_maker() as session:
        try:
            inserted: list[str] = []
            updated: list[str] = []
            for seed in _SEED_USERS:
                existing = await session.execute(select(User).where(User.email == seed.email))
                user = existing.scalar_one_or_none()
                if user is not None:
                    if user.name != seed.name:
                        user.name = seed.name
                        updated.append(seed.email)
                    continue
                session.add(
                    User(
                        email=seed.email,
                        name=seed.name,
                        password_hash=_pwd.hash(seed.password),
                    )
                )
                inserted.append(seed.email)
            if inserted or updated:
                await session.commit()
                logger.info(
                    f"テスト用アカウントを投入/更新しました: inserted={len(inserted)} updated={len(updated)}"
                )
            else:
                logger.info("テスト用アカウントは既に最新のためスキップしました")
        except Exception:
            await session.rollback()
            raise
