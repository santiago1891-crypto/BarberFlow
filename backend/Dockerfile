# BarberFlow — Backend (FastAPI + uv)
FROM python:3.12-slim

# build-essential: red de seguridad por si algún paquete no trae wheel
# precompilado para la plataforma del host (ej. en Apple Silicon/ARM).
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# uv: el mismo gestor de dependencias que ya usa el proyecto localmente.
# La reproducibilidad real la da uv.lock, no la versión exacta de este
# binario, así que usamos "latest" en vez de pinnear una versión.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

# Copiamos primero solo el lockfile para que Docker cachee esta capa:
# mientras no cambien las dependencias, no hace falta reinstalar nada aunque
# cambie el código de la app.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen

# Ahora sí, el resto del código.
COPY . .

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
