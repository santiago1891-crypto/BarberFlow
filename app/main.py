from fastapi import Depends, FastAPI

from app.api.deps import get_current_admin
from app.api.routers import auth, barberos, pagos, reportes, servicios_realizados, tipos_servicio, turnos
from app.core.config import settings

app = FastAPI(
    title="Barbería CRUD API",
    description="API para gestionar barberos, turnos, servicios y pagos de la barbería.",
    version="0.1.0",
    debug=settings.debug,
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


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "env": settings.app_env}
