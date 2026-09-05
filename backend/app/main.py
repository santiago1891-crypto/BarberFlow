from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.deps import get_current_admin
from app.api.routers import auth, barberos, pagos, reportes, servicios_realizados, tipos_servicio, turnos
from app.core.config import settings
from app.crud.base import ReglaDeNegocioError

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


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "env": settings.app_env}
