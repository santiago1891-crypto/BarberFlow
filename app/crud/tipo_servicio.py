from app.crud.base import CRUDBase
from app.models.tipo_servicio import TipoServicio
from app.schemas.tipo_servicio import TipoServicioCreate, TipoServicioUpdate


class CRUDTipoServicio(CRUDBase[TipoServicio, TipoServicioCreate, TipoServicioUpdate]):
    pass


tipo_servicio = CRUDTipoServicio(TipoServicio)
