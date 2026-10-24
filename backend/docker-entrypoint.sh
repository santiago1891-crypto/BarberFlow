#!/bin/sh
set -e

# Si estás adoptando Docker sobre una base que YA tenía datos (no una
# creada de cero por este mismo docker-compose), "alembic upgrade head"
# automático puede fallar o duplicar tablas. En ese caso, arrancá el
# contenedor una vez con SKIP_AUTO_MIGRATE=true, entrá con
# `docker compose exec backend sh` y corré vos mismo el `alembic stamp ...`
# que corresponda (ver README) antes de sacar esta variable.
if [ "$SKIP_AUTO_MIGRATE" = "true" ]; then
  echo "SKIP_AUTO_MIGRATE=true -> no se corren migraciones automáticas."
  exec "$@"
fi

# Aplica las migraciones de Alembic antes de arrancar. Reintenta unas
# cuantas veces por si Postgres todavía no terminó de levantar (el
# healthcheck de docker-compose ya debería evitar esto, pero por las dudas).
echo "Aplicando migraciones de Alembic..."
attempt=1
until alembic upgrade head; do
  if [ "$attempt" -ge 10 ]; then
    echo "No se pudieron aplicar las migraciones después de 10 intentos." >&2
    exit 1
  fi
  echo "Reintentando migraciones en 2s... (intento $attempt/10)"
  attempt=$((attempt + 1))
  sleep 2
done

echo "Migraciones aplicadas. Arrancando la app..."
exec "$@"
