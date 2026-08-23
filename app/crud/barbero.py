from app.crud.base import CRUDBase
from app.models.barbero import Barbero
from app.schemas.barbero import BarberoCreate, BarberoUpdate


class CRUDBarbero(CRUDBase[Barbero, BarberoCreate, BarberoUpdate]):
    pass


barbero = CRUDBarbero(Barbero)
