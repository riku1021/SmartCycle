import uuid
from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.config.settings import Settings
from src.infrastructure.db.models.user import User

_pwd = PasswordHash.recommended()


class AuthService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._session = session
        self._settings = settings

    def _hash_password(self, password: str) -> str:
        return _pwd.hash(password)

    def _verify_password(self, plain: str, hashed: str) -> bool:
        return _pwd.verify(plain, hashed)

    async def get_user_by_email(self, email: str) -> User | None:
        result = await self._session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_user_by_id(self, user_id: int) -> User | None:
        result = await self._session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def register(
        self,
        *,
        email: str,
        password: str,
        name: str,
    ) -> User:
        user = User(
            email=email,
            name=name,
            password_hash=self._hash_password(password),
        )
        self._session.add(user)
        await self._session.flush()
        await self._session.refresh(user)
        return user

    async def authenticate(self, email: str, password: str) -> User | None:
        user = await self.get_user_by_email(email)
        if user is None or not self._verify_password(password, user.password_hash):
            return None
        return user

    def create_access_token(self, user_id: int) -> str:
        now = datetime.now(tz=UTC)
        expire = now + timedelta(minutes=self._settings.jwt_expire_minutes)
        return jwt.encode(
            {
                "sub": str(user_id),
                "exp": expire,
                "jti": str(uuid.uuid4()),
            },
            self._settings.jwt_secret,
            algorithm=self._settings.jwt_algorithm,
        )

    def decode_sub_user_id(self, token: str) -> int:
        payload = jwt.decode(
            token,
            self._settings.jwt_secret,
            algorithms=[self._settings.jwt_algorithm],
        )
        sub = payload.get("sub")
        if not isinstance(sub, str) or not sub.isdecimal():
            msg = "Invalid token sub"
            raise jwt.InvalidTokenError(msg)
        return int(sub)
