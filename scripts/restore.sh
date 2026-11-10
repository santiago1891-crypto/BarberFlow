#!/bin/sh
# BarberFlow — Restore de un backup sobre la instancia actual.
#
# Uso:
#   ./scripts/restore.sh backups/barberia-2026-11-09.sql.gz
#
# ADVERTENCIA: sobrescribe TODO lo que haya en la base de la instancia.
# Sirve para el drill mensual (probá sobre una instancia de prueba) y para
# recuperarte de un desastre. Después del restore, verificá /health y entrá
# a la app a revisar los datos.
set -eu

ARCHIVO="${1:?Uso: $0 <archivo.sql.gz>}"
cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-.env}"
COMPOSE_FILE="${COMPOSE_FILE:-compose.prod.yaml}"

[ -f "$ARCHIVO" ] || { echo "No existe el archivo: $ARCHIVO"; exit 1; }

echo "ATENCIÓN: esto sobrescribe la base de la instancia actual."
printf "Escribí 'si' para continuar: "
read -r RESPUESTA
[ "$RESPUESTA" = "si" ] || { echo "Cancelado."; exit 1; }

echo "Restaurando $ARCHIVO ..."
gunzip -c "$ARCHIVO" | docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" \
    exec -T db psql -U postgres -v ON_ERROR_STOP=1 barberia

echo "Listo. Verificá: curl https://<dominio>/api/health"
