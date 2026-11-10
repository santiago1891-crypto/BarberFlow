import logging

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.deps import get_current_admin
from app.api.routers import auth, barberos, cierres_caja, pagos, reportes, servicios_realizados, tipos_servicio, turnos
from app.core.config import settings
from app.crud.base import ReglaDeNegocioError
from app.db.session import engine

logger = logging.getLogger("barberflow")

app = FastAPI(
    title="Barbería CRUD API",
    description="API para gestionar barberos, turnos, servicios y pagos de la barbería.",
    version="0.1.0",
    debug=settings.debug,
)

# Habilita que el frontend (BarberFlow, servido aparte con Vite) pueda
# llamar a esta API desde el navegador.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Manejador global: cualquier router que deje pasar una ReglaDeNegocioError
# (violación de regla de negocio o de integridad en la base) se traduce acá
# a un 409 con un mensaje legible, en vez de un 500 genérico. Antes solo
# turnos.py la capturaba a mano en cada endpoint; con esto queda cubierto
# también barberos, tipos-servicio, pagos y servicios-realizados.
@app.exception_handler(ReglaDeNegocioError)
async def regla_de_negocio_handler(request, exc: ReglaDeNegocioError):
    return JSONResponse(status_code=409, content={"detail": str(exc)})


# Errores de base de datos no previstos (FK rota, dato fuera de rango,
# sesión caída). Sin este handler el 500 lo genera el middleware de
# ServerError, que está POR FUERA de CORS: el navegador no ve las cabeceras
# Access-Control-Allow-Origin y reporta el fallo como "no se pudo conectar
# con el servidor", ocultando el problema real. Acá se responde 500 JSON
# desde dentro de CORS, con el detalle en el log del servidor.
@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_error_handler(request, exc: SQLAlchemyError):
    logger.exception("Error de base de datos en %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno al consultar la base de datos. Revisá el log del servidor."},
    )


# Login: abierto, sin JWT (es donde se obtiene el JWT)
app.include_router(auth.router)

# Todo lo demás requiere estar autenticado como admin
protegido = [Depends(get_current_admin)]
app.include_router(barberos.router, dependencies=protegido)
app.include_router(tipos_servicio.router, dependencies=protegido)
app.include_router(turnos.router, dependencies=protegido)
app.include_router(servicios_realizados.router, dependencies=protegido)
app.include_router(pagos.router, dependencies=protegido)
app.include_router(reportes.router, dependencies=protegido)
app.include_router(cierres_caja.router, dependencies=protegido)


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "env": settings.app_env}


# Healthcheck para el orquestador y el monitor de uptime. No requiere auth.
# 200 = todo bien; 503 = la base no responde (para que el monitor avise
# apenas, y no recién cuando el dueño de la barbería se queje).
@app.get("/health", tags=["Health"])
async def health():
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        logger.exception("Healthcheck: no se pudo consultar la base de datos")
        return JSONResponse(status_code=503, content={"status": "error", "db": "down"})
    return {"status": "ok", "db": "ok", "env": settings.app_env, "version": app.version}
