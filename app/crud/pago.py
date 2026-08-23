from app.crud.base import CRUDBase
from app.models.pago import Pago
from app.schemas.pago import PagoCreate, PagoUpdate


class CRUDPago(CRUDBase[Pago, PagoCreate, PagoUpdate]):
    pass


pago = CRUDPago(Pago)
