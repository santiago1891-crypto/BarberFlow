from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


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


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
