import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.config.deps import get_settings
from src.infrastructure.config.settings import Settings
from src.infrastructure.db.models.user import User
from src.infrastructure.db.session import get_db
from src.infrastructure.logger.logger import logger

from .dependencies import get_current_user, get_dev_user
from .service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def _mask_email_for_log(email: str) -> str:
    local, _, domain = email.partition("@")
    if not local or not domain:
        return "***"
    masked_local = f"{local[0]}*" if len(local) <= 2 else f"{local[:2]}***"
    return f"{masked_local}@{domain}"


class SignupBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=256)
    name: str | None = None


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    name: str

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


@router.post("/signup", response_model=TokenResponse)
async def signup(
    body: SignupBody,
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TokenResponse:
    auth = AuthService(session, settings)
    if await auth.get_user_by_email(str(body.email)) is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    name = (body.name or str(body.email).split("@", maxsplit=1)[0]).strip() or "user"
    try:
        user = await auth.register(email=str(body.email), password=body.password, name=name)
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        ) from exc
    token = auth.create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginBody,
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TokenResponse:
    email = str(body.email)
    masked_email = _mask_email_for_log(email)
    logger.info(f"ログイン試行: email={masked_email}")
    auth = AuthService(session, settings)
    existing_user = await auth.get_user_by_email(email)
    if existing_user is None:
        logger.warning(f"ログイン失敗(未登録): email={masked_email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email not registered",
        )
    user = await auth.authenticate(email, body.password)
    if user is None:
        logger.warning(f"ログイン失敗(パスワード不一致): email={masked_email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = auth.create_access_token(user.id)
    logger.info(f"ログイン成功: user_id={user.id}, email={masked_email}")
    return TokenResponse(
        access_token=token,
        user=UserOut.model_validate(user),
    )


class UserDetailOut(UserOut):
    created_at: datetime
    role: str
    is_fixed: bool  # シードユーザーは権限変更不可


# 権限を固定するシードユーザーのメールアドレス
FIXED_ROLE_EMAILS = {"admin@mail.com", "dev@mail.com", "user@mail.com"}


@router.get("/me", response_model=UserOut)
async def me(current: User = Depends(get_current_user)) -> User:
    return current


@router.get("/users", response_model=list[UserDetailOut])
async def list_users(
    session: AsyncSession = Depends(get_db),
    current: User = Depends(get_dev_user),
) -> list[UserDetailOut]:
    """開発者向け: 全ユーザーの一覧を取得する"""
    result = await session.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()

    out_users = []
    for u in users:
        # シードユーザーは email でロールを固定表示、それ以外は DB の role を使う
        if u.email == "admin@mail.com":
            role = "admin"
        elif u.email == "dev@mail.com":
            role = "dev"
        elif u.email == "user@mail.com":
            role = "user"
        else:
            role = u.role  # DB の値を使用

        out_users.append(
            UserDetailOut(
                id=u.id,
                email=u.email,
                name=u.name,
                created_at=u.created_at,
                role=role,
                is_fixed=u.email in FIXED_ROLE_EMAILS,
            )
        )
    return out_users


class UpdateRoleBody(BaseModel):
    role: str = Field(..., pattern="^(admin|dev|user)$")


@router.patch("/users/{user_id}/role", response_model=UserDetailOut)
async def update_user_role(
    user_id: uuid.UUID,
    body: UpdateRoleBody,
    session: AsyncSession = Depends(get_db),
    current: User = Depends(get_dev_user),
) -> UserDetailOut:
    """開発者向け: 一般ユーザーの権限を変更する（シードユーザーは変更不可）"""
    result = await session.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if target.email in FIXED_ROLE_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot change role of a fixed system user",
        )
    target.role = body.role
    await session.commit()
    await session.refresh(target)
    return UserDetailOut(
        id=target.id,
        email=target.email,
        name=target.name,
        created_at=target.created_at,
        role=target.role,
        is_fixed=False,
    )
