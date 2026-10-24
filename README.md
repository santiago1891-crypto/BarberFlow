# BarberFlow
<p align="center">
  <a href="https://docs.python.org/3/" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Python-3.12%2B-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" /></a>
  <a href="https://fastapi.tiangolo.com/" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/FastAPI-0.136%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" /></a>
  <a href="https://react.dev/" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=20232A" alt="React" /></a>
  <a href="https://vite.dev/" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="https://tailwindcss.com/docs" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://www.postgresql.org/docs/" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/PostgreSQL-compatible-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
  <a href="https://www.docker.com/" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Docker-blue?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" /></a>
</p>




Sistema de gestión para barberías: organiza el equipo, los turnos, los servicios realizados, los pagos y los reportes desde una sola aplicación.

## Funcionalidades

- Inicio de sesión de administrador con JWT.
- Gestión de barberos y disponibilidad del equipo.
- Administración de servicios, precios y comisiones.
- Registro y seguimiento de turnos.
- Historial de servicios realizados, pagos y ventas.
- Panel de control e informes operativos y financieros.
- Interfaz adaptable a escritorio y móvil.

## Tecnologías

- **Frontend:** React 18, Vite, Tailwind CSS y Lucide React.
- **Backend:** Python 3.12+, FastAPI, SQLAlchemy, Pydantic Settings y Uvicorn.
- **Base de datos:** PostgreSQL; asyncpg para la API y psycopg2 para las migraciones Alembic.
- **Infraestructura local:** Docker Compose, con frontend Nginx y PostgreSQL persistente.

## Requisitos

- Docker Desktop (incluye Docker Compose).
- Python 3.12+ solo para generar el hash de contraseña si no se usa el contenedor.

## Inicio con Docker

1. Copia la plantilla de variables de entorno:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Genera el hash de la contraseña del administrador. El comando solicita la contraseña dos veces:

   ```powershell
   docker compose run --build --rm --no-deps backend python generar_hash_admin.py
   ```

   Copia la línea `ADMIN_PASSWORD_HASH=...` que imprime el comando en `.env`, reemplazando el valor de ejemplo. Cambia también `SECRET_KEY` por una clave aleatoria antes de iniciar la aplicación. Puedes generar una con Python:

   ```powershell
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

3. Construye e inicia todos los servicios:

   ```powershell
   docker compose up --build
   ```

4. Abre la aplicación:

   - Frontend: <http://localhost:5173>
   - API y estado: <http://localhost:8000>
   - Documentación interactiva: <http://localhost:8000/docs>

La API espera a que PostgreSQL esté saludable, aplica las migraciones Alembic y luego inicia. Los datos de PostgreSQL permanecen en el volumen `postgres_data` al detener los contenedores.

Para detener los servicios, usa `Ctrl+C` y luego `docker compose down`. Para borrar también la base de datos local, ejecuta `docker compose down -v`; esto elimina permanentemente los datos guardados en el volumen.

## Configuración

`.env.example` contiene la configuración local completa. Los valores de PostgreSQL y `DATABASE_URL` deben coincidir. `CORS_ORIGINS` debe incluir el origen desde el que se abre el frontend, por defecto `http://localhost:5173`.

No uses los valores de ejemplo en un entorno público. Configura una contraseña segura, un `SECRET_KEY` aleatorio y credenciales propias de PostgreSQL. Si una contraseña de PostgreSQL contiene caracteres especiales, codifícala para usarla dentro de `DATABASE_URL`.

## Desarrollo sin Docker

También puedes iniciar el frontend con `npm install` y `npm run dev` desde `frontend/`, y la API desde `backend/` con `uvicorn app.main:app --reload`. En ese caso, configura `DATABASE_URL` en `backend/.env` para que apunte a PostgreSQL accesible desde el equipo, por ejemplo con el host `localhost`, e instala las dependencias con `pip install -e .`.

## Estructura

```text
backend/
  app/             API, configuración, modelos, esquemas y acceso a datos
  migrations/      Migraciones Alembic
  Dockerfile
frontend/
  src/             Aplicación React
  Dockerfile       Build Vite y servidor Nginx
compose.yaml       Servicios de frontend, API y PostgreSQL
.env.example      Plantilla de configuración local
```
