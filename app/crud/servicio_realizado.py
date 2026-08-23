from app.crud.base import CRUDBase
from app.models.servicio_realizado import ServicioRealizado
from app.schemas.servicio_realizado import ServicioRealizadoCreate, ServicioRealizadoUpdate


class CRUDServicioRealizado(CRUDBase[ServicioRealizado, ServicioRealizadoCreate, ServicioRealizadoUpdate]):
    pass


servicio_realizado = CRUDServicioRealizado(ServicioRealizado)
