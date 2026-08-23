from app.crud.base import CRUDBase
from app.models.turno import Turno
from app.schemas.turno import TurnoCreate, TurnoUpdate


class CRUDTurno(CRUDBase[Turno, TurnoCreate, TurnoUpdate]):
    pass


turno = CRUDTurno(Turno)
