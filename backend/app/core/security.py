from datetime import datetime, timedelta, timezone
import os
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.database import get_db

_WEAK_SECRETS = {
    "",
    "altere-esta-chave-em-producao",
    "metrica-tjrr-dev-only-change-in-production",
    "change-me",
}


def _resolve_secret_key() -> str:
    key = os.getenv("SECRET_KEY", "")
    env = os.getenv("ENV", "development").lower()
    if env == "production" and (not key or key in _WEAK_SECRETS or len(key) < 32):
        raise RuntimeError("SECRET_KEY forte (mín. 32 caracteres) é obrigatória quando ENV=production.")
    return key or "metrica-tjrr-dev-only-change-in-production"


SECRET_KEY = _resolve_secret_key()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")
DUMMY_PASSWORD_HASH = pwd_context.hash("not-a-real-password")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from app.models import Usuario

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas ou token expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


def require_roles(*roles: str):
    def _dependency(current_user=Depends(get_current_user)):
        perfil = current_user.perfil_dft.value if hasattr(current_user.perfil_dft, "value") else str(current_user.perfil_dft)
        if perfil not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Perfil sem permissão para esta operação.",
            )
        return current_user

    return _dependency
