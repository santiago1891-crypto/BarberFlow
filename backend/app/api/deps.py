from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import get_db

# tokenUrl solo se usa para que Swagger sepa a qué endpoint apunta el botón "Authorize"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def get_current_admin(token: str = Depends(oauth2_scheme)) -> str:
    """Valida el JWT recibido y confirma que corresponde al admin configurado."""
    credenciales_invalidas = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas o token expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    username = decode_access_token(token)
    if username is None or username != settings.admin_username:
        raise credenciales_invalidas

    return username


__all__ = ["get_db", "get_current_admin"]

