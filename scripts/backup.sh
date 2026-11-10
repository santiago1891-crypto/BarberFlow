#!/bin/sh
# BarberFlow — Backup diario de la base de una instancia.
#
# Uso (dentro de la carpeta de la instancia o con cd a ella):
#   ./scripts/backup.sh
#
# Variables opcionales:
#   ENV_FILE         env del compose          (default: .env)
#   COMPOSE_FILE     archivo compose          (default: compose.prod.yaml)
#   COMPOSE_PROJECT_NAME  nombre del proyecto (default: nombre de la carpeta)
#   BACKUP_DIR       destino local de dumps   (default: ./backups)
#   RETENTION_DAYS   retención local en días  (default: 30)
#   RCLONE_REMOTE    destino offsite opcional (ej: b2:barberflow/cliente-1)
#
# El dump se genera con --clean --if-exists para que el restore sea directo.
# Restaurar (drill mensual o desastre):
#   ./scripts/restore.sh backups/barberia-2026-11-09.sql.gz
set -eu

cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-.env}"
COMPOSE_FILE="${COMPOSE_FILE:-compose.prod.yaml}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
FECHA="$(date +%F)"
SALIDA="$BACKUP_DIR/barberia-$FECHA.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Dump de la base -> $SALIDA"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T db \
    pg_dump -U postgres --clean --if-exists barberia | gzip > "$SALIDA"

# Verificación mínima: si el gzip está roto, el backup no sirve.
gzip -t "$SALIDA"

if [ -n "${RCLONE_REMOTE:-}" ] && command -v rclone >/dev/null 2>&1; then
    echo "Subiendo a $RCLONE_REMOTE"
    rclone copy "$SALIDA" "$RCLONE_REMOTE"
else
    echo "Aviso: sin RCLONE_REMOTE o sin rclone -> el backup queda SOLO local."
    echo "       Un backup solo en el mismo disco no protege contra robo/fallo."
fi

# Retención local
find "$BACKUP_DIR" -name 'barberia-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete

echo "Backup OK ($(du -h "$SALIDA" | cut -f1))"
