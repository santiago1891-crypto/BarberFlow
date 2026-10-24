import re
from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


# Formato de un hash bcrypt: $2b$ + costo (2 dígitos) + $ + 53 caracteres (salt + hash).
_BCRYPT_HASH_RE = re.compile(r"\$2[abxy]\$\d{2}\$[./A-Za-z0-9]{53}")


class Settings(BaseSettings):
    """Configuración de la app, leída desde variables de entorno / .env"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str
    app_env: str = "development"
    debug: bool = False

    # --- Autenticación (admin único) ---
    admin_username: str
    admin_password_hash: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 120

    # --- CORS: orígenes desde los que se puede llamar a la API ---
    # En .env se define como string separado por comas, ej:
    # CORS_ORIGINS=http://localhost:5173,https://mi-frontend.com
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("admin_password_hash")
    @classmethod
    def _validate_bcrypt_hash(cls, value: str) -> str:
        """Falla al arrancar (con un mensaje claro) si el hash no es bcrypt válido.

        Sin esto, un hash roto no se nota hasta el primer login, que termina en
        un 500 ("ValueError: Invalid salt") — y como ese 500 no lleva cabeceras
        CORS, el navegador lo muestra como "no se pudo conectar con la API".
        El caso típico es Docker Compose: interpreta cada "$" del hash como una
        variable y se "come" un tramo.
        """
        if not _BCRYPT_HASH_RE.fullmatch(value):
            raise ValueError(
                "ADMIN_PASSWORD_HASH no es un hash bcrypt válido (debería tener 60 "
                f"caracteres y empezar con $2b$12$; este tiene {len(value)}). Si lo "
                "pasás por Docker Compose o un .env, ponelo entre comillas SIMPLES: "
                "ADMIN_PASSWORD_HASH='$2b$12$...' — sin comillas, Compose interpreta "
                "los '$' como variables y deja el hash incompleto."
            )
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
