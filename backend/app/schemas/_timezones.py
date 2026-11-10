"""Normalización de fechas que llegan del cliente.

Las columnas de la base son `DateTime(timezone=True)`: Postgres devuelve
fechas CON timezone (aware). Si el cliente manda una fecha sin timezone
(naive) — que es lo normal en un `curl`, una integración o una app móvil —
el backend chocaba al compararla con las de la base:

    TypeError: can't compare offset-naive and offset-aware datetimes  -> 500

La UI no lo sufrió porque manda `toISOString()` (UTC, aware). Igual, una
fecha naive se interpreta en la zona horaria configurada de la barbería
(TIMEZONE), que es donde el dueño cree que está mirando la hora.
"""

from datetime import datetime, timedelta, timezone

from app.core.config import settings

# Argentina no tiene horario de verano desde 2009: offset fijo evita
# depender de tzdata en la imagen.
_ART_OFFSET = timezone(timedelta(hours=-3))


def _offset_horario():
    """Zona horaria configurada (default: ART)."""
    try:
        from zoneinfo import ZoneInfo

        return ZoneInfo(settings.timezone)
    except Exception:
        return _ART_OFFSET


def a_aware(value: datetime | None) -> datetime | None:
    """Devuelve la fecha con timezone. Si viene naive, la interpreta en la
    zona horaria de la barbería (no en UTC: el dueño piensa en hora local).

    Acepta también un string ISO (Pydantic con `mode="before"` todavía no
    lo parseó a datetime).
    """
    if value is None:
        return None
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            # Que Pydantic sea quien rechace el formato inválido.
            return value
    if value.tzinfo is not None:
        return value
    return value.replace(tzinfo=_offset_horario())
