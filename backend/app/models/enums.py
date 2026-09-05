import enum


class EstadoTurno(str, enum.Enum):
    pendiente = "pendiente"
    confirmado = "confirmado"
    en_curso = "en_curso"
    completado = "completado"
    cancelado = "cancelado"


class EstadoPago(str, enum.Enum):
    pendiente = "pendiente"
    pagado = "pagado"
    reembolsado = "reembolsado"


class MetodoPago(str, enum.Enum):
    efectivo = "efectivo"
    tarjeta_debito = "tarjeta_debito"
    tarjeta_credito = "tarjeta_credito"
    transferencia = "transferencia"
    mercado_pago = "mercado_pago"
