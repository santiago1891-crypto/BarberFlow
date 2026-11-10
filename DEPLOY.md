# Despliegue de BarberFlow (producción)

Guía de instalación, backup y baja de una instancia. **Una instancia por
compositor/comercio**: así el backup, la actualización y la baja de un
cliente no afectan a los demás.

Archivos que hacen falta (ya están en el repo):

| Archivo | Para qué |
|---|---|
| `compose.prod.yaml` | Stack de producción (sin `--reload`, sin bind mounts, DB sin puertos expuestos) |
| `Caddyfile` | Reverse proxy con HTTPS automático; la API va bajo `/api` |
| `frontend/nginx.conf` | Sirve el build estático de Vite con fallback a `index.html` |
| `scripts/backup.sh` | Dump diario de la base + subida opcional a storage externo |
| `scripts/restore.sh` | Restore (drill mensual o desastre) |
| `scripts/seed_demo.py` | Datos falsos para demo/staging |

---

## 1. Instalación manual (una vez por comercio)

### 1.1 Requisitos
- VPS Ubuntu 24.04, 2 vCPU / 4 GB RAM / 40 GB (alcanza para varios
  clientes si querés concentrarlos, pero para empezar: **1 VPS por cliente**).
- Un dominio con el subdominio apuntando a la IP del VPS
  (registro `A`: `barberia.tudominio.com` → IP).

### 1.2 Preparar el servidor

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
```

### 1.3 Traer el proyecto

```bash
mkdir -p /opt/barberflow && cd /opt/barberflow
git clone git@github.com:usuario/BarberFlow.git .
```

### 1.4 Generar secretos

```bash
cp .env.example .env

openssl rand -hex 32     # -> SECRET_KEY
openssl rand -base64 24  # -> POSTGRES_PASSWORD

# Hash de la contraseña del admin (te pide la contraseña dos veces):
docker compose -f compose.prod.yaml build backend
docker compose -f compose.prod.yaml run --rm backend python generar_hash_admin.py
```

Pegá la línea `ADMIN_PASSWORD_HASH='...'` en `.env`, **entre comillas simples**
(sin comillas, Compose interpreta los `$` del hash y el login falla con un 500).

### 1.5 `.env` de producción

```env
POSTGRES_PASSWORD=<lo generado>
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH='$2b$12$...'
SECRET_KEY=<lo generado>
APP_ENV=production
DEBUG=False
TIMEZONE=America/Argentina/Buenos_Aires
APP_SITE=https://barberia.tudominio.com
VITE_API_URL=https://barberia.tudominio.com/api
CORS_ORIGINS=https://barberia.tudominio.com
CADDY_HTTP_PORT=80
CADDY_TLS_PORT=443
```

> Con la API bajo `/api` la app y la API comparten origen: **CORS no hace
> falta**. `CORS_ORIGINS` queda como respaldo por si algún día servís la API
> desde otro dominio.

### 1.6 Levantar

```bash
docker compose -f compose.prod.yaml --env-file .env up -d --build
docker compose -f compose.prod.yaml --env-file .env logs -f backend
```

Las migraciones de Alembic corren solas al arrancar el backend.

### 1.7 Verificar

```bash
curl https://barberia.tudominio.com/api/health   # {"status":"ok","db":"ok",...}
docker compose -f compose.prod.yaml --env-file .env ps   # todos "healthy"
```

Abrir `https://barberia.tudominio.com`, loguearse y crear un barbero y un
servicio de prueba.

---

## 2. Backup

```bash
# Backup diario (cron a las 03:00)
crontab -e
0 3 * * * cd /opt/barberflow && ./scripts/backup.sh >> /var/log/barberflow-backup.log 2>&1
```

Variables opcionales (exportarlas en el cron o en el entorno):

```bash
RCLONE_REMOTE=b2:barberflow/barberia-cliente-1   # storage externo (Backblaze/S3)
RETENTION_DAYS=30
```

**Sin destino externo el backup solo protege contra borrado accidental, no
contra fallo/robo del VPS.** Configurá `rclone` con algún bucket.

**Drill mensual obligatorio**: restaurar sobre una instancia de prueba y
verificar que la app levante y los números cierren.

```bash
./scripts/restore.sh backups/barberia-2026-11-09.sql.gz
```

---

## 3. Actualizar una instancia

```bash
cd /opt/barberflow
git pull
docker compose -f compose.prod.yaml --env-file .env up -d --build
```

Antes de aplicar una migración nueva: backup (`./scripts/backup.sh`) y
probar `alembic upgrade head` sobre una copia.

---

## 4. Baja del servicio (offboarding)

1. **Confirmación por escrito** con la fecha efectiva y última factura.
2. **Exportar los datos** y entregarlos (link con vencimiento):

   ```bash
   cd /opt/barberflow
   docker compose -f compose.prod.yaml --env-file .env exec -T db \
     pg_dump -U postgres barberia | gzip > baja-cliente-$(date +%F).sql.gz
   ```

3. **Apagar** (revocar acceso):

   ```bash
   docker compose -f compose.prod.yaml --env-file .env down
   ```

   Quitar el registro DNS y, si es un VPS compartido, el sitio de Caddy.

4. **Retención 30 días**: conservar el dump (y el volumen) por si piden
   volver o hay una disputa. Esto va en los TyC.
5. **Borrado definitivo** pasada la retención, con confirmación escrita:

   ```bash
   docker compose -f compose.prod.yaml --env-file .env down -v   # borra la DB
   rm -rf backups/                                               # borra dumps
   ```

6. Registrar en la planilla de clientes: slug, fecha de baja, backup
   entregado, facturación cerrada.

---

## 5. Staging local (probar el stack de producción en tu máquina)

```bash
docker compose --env-file .env.staging -f compose.prod.yaml up -d --build
# App: http://localhost:8090   (admin / barberflow-staging)

# Datos falsos:
docker compose --env-file .env.staging -f compose.prod.yaml \
  exec -T backend python - < scripts/seed_demo.py

# Apagar y borrar todo (los datos de staging, no los del desarrollo):
docker compose --env-file .env.staging -f compose.prod.yaml down -v
```

El stack de desarrollo (`docker compose up`, `compose.yaml`) sigue en el
puerto 5173/8000 y no se toca.
