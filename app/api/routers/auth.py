from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.schemas.auth import Token

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Login del administrador. Usa el formulario estándar OAuth2 (username/password)
    para poder usar el botón "Authorize" de Swagger en /docs directamente.
    """
    credenciales_validas = form_data.username == settings.admin_username and verify_password(
        form_data.password, settings.admin_password_hash
    )
    if not credenciales_validas:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=form_data.username)
    return Token(access_token=access_token)
