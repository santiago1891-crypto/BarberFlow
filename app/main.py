from fastapi import FastAPI

from app.api.routers import barberos, pagos, servicios_realizados, tipos_servicio, turnos
from app.core.config import settings

app = FastAPI(
    title="Barbería CRUD API",
    description="API para gestionar barberos, turnos, servicios y pagos de la barbería.",
    version="0.1.0",
    debug=settings.debug,
)

app.include_router(barberos.router)
app.include_router(tipos_servicio.router)
app.include_router(turnos.router)
app.include_router(servicios_realizados.router)
app.include_router(pagos.router)


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "env": settings.app_env}
