"""crear vistas de reportes (v_agenda_hoy, v_comisiones_mes_actual)

Los endpoints /reportes/agenda-hoy y /reportes/comisiones-mes-actual leen
estas dos vistas con SELECT directo (ver app/crud/reportes.py). Existían en
la base original (esquema armado a mano), pero las migraciones anteriores
solo crean tablas, así que en una base creada desde cero (por ejemplo la de
docker-compose) esos endpoints fallaban con
    relation "public.v_agenda_hoy" does not exist
y el frontend lo mostraba como "No se pudo conectar con el servidor".

Cada vista se crea SOLO si todavía no existe: en una base que ya las tenía
(la original) no se toca la definición que ya estaba.

"Hoy" y "mes en curso" se calculan con la zona horaria de la sesión de
Postgres, igual que el resto de los reportes de hoy (ver _es_hoy() en
app/crud/reportes.py).

Revision ID: e2a80e287cef
Revises: 4f5f8dc20f76
Create Date: 2026-10-08 18:40:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'e2a80e287cef'
down_revision: Union[str, Sequence[str], None] = '4f5f8dc20f76'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Turnos de hoy (menos los cancelados), con barbero y servicio ya resueltos,
# ordenados por hora. Las columnas coinciden con AgendaHoyItem.
_V_AGENDA_HOY = """
CREATE VIEW public.v_agenda_hoy AS
SELECT
    t.id                                AS turno_id,
    b.nombre || ' ' || b.apellido       AS barbero,
    ts.nombre                           AS servicio,
    t.fecha_hora                        AS fecha_hora,
    t.estado                            AS estado,
    t.cliente_nombre                    AS cliente_nombre,
    t.cliente_telefono                  AS cliente_telefono,
    ts.duracion_min                     AS duracion_min
FROM public.turnos t
JOIN public.barberos b        ON b.id  = t.barbero_id
JOIN public.tipos_servicio ts ON ts.id = t.tipo_servicio_id
WHERE CAST(t.fecha_hora AS date) = CURRENT_DATE
  AND t.estado <> 'cancelado'
ORDER BY t.fecha_hora
"""

# Por cada barbero activo: servicios, facturación y comisiones del mes en
# curso + sueldo fijo = ingreso del mes. LEFT JOIN: un barbero sin servicios
# todavía este mes aparece igual, con ceros. Coincide con ComisionesMesActualItem.
_V_COMISIONES_MES_ACTUAL = """
CREATE VIEW public.v_comisiones_mes_actual AS
SELECT
    b.id                                              AS barbero_id,
    b.nombre || ' ' || b.apellido                     AS barbero,
    b.sueldo_fijo                                     AS sueldo_fijo,
    COUNT(sr.id)                                      AS servicios_realizados,
    COALESCE(SUM(sr.precio_cobrado), 0)               AS total_facturado,
    COALESCE(SUM(sr.comision_monto), 0)               AS total_comisiones,
    b.sueldo_fijo + COALESCE(SUM(sr.comision_monto), 0) AS ingreso_total_mes
FROM public.barberos b
LEFT JOIN public.servicios_realizados sr
       ON sr.barbero_id = b.id
      AND sr.fecha_hora >= date_trunc('month', now())
      AND sr.fecha_hora <  date_trunc('month', now()) + interval '1 month'
WHERE b.activo
GROUP BY b.id, b.nombre, b.apellido, b.sueldo_fijo
ORDER BY b.apellido, b.nombre
"""


def _create_view_if_missing(name: str, definition: str) -> None:
    # to_regclass devuelve NULL si el objeto no existe. $vista$ evita tener
    # que escapar las comillas simples de la definición.
    op.execute(
        f"""
        DO $$
        BEGIN
            IF to_regclass('public.{name}') IS NULL THEN
                EXECUTE $vista${definition}$vista$;
            END IF;
        END
        $$;
        """
    )


def upgrade() -> None:
    """Upgrade schema."""
    _create_view_if_missing("v_agenda_hoy", _V_AGENDA_HOY)
    _create_view_if_missing("v_comisiones_mes_actual", _V_COMISIONES_MES_ACTUAL)


def downgrade() -> None:
    """Downgrade schema.

    Ojo: si tu base ya tenía estas vistas de antes (la original), esto también
    las borra — son solo vistas (no guardan datos) y se recrean con un upgrade.
    """
    op.execute("DROP VIEW IF EXISTS public.v_comisiones_mes_actual")
    op.execute("DROP VIEW IF EXISTS public.v_agenda_hoy")
