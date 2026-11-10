"""
BarberFlow — Datos falsos para demo / staging.

Corre DENTRO del contenedor del backend (usa el CRUD real, con sus reglas de
negocio: solapamiento de turnos, transiciones de estado, etc.):

    docker compose --env-file .env.staging -f compose.prod.yaml \
        exec -T backend python - < scripts/seed_demo.py

Es idempotente: si los barberos/servicios ya existen se reutilizan y no se
duplica nada. Crea:
  - 2 barberos y 4 servicios
  - turnos de HOY (algunos pendientes/confirmados para la agenda)
  - turnos completados -> servicios realizados (la caja de hoy)
  - pagos en distintos métodos (efectivo, transferencia, débito, MP)
"""

import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select

from app import crud
from app.crud import cierre_caja
from app.db.session import AsyncSessionLocal
from app.models.barbero import Barbero
from app.models.enums import EstadoPago, EstadoTurno
from app.models.pago import Pago
from app.models.servicio_realizado import ServicioRealizado
from app.models.tipo_servicio import TipoServicio
from app.models.turno import Turno
from app.schemas.barbero import BarberoCreate
from app.schemas.pago import PagoCreate, PagoUpdate
from app.schemas.tipo_servicio import TipoServicioCreate
from app.schemas.turno import TurnoCompletar, TurnoCreate, TurnoUpdate

# Argentina no tiene horario de verano: offset fijo evita depender de tzdata.
ART = timezone(timedelta(hours=-3))

BARBEROS = [
    dict(nombre="Santiago", apellido="Nollla", telefono="11-5555-0001",
         sueldo_fijo=Decimal("0"), porcentaje_comision=Decimal("40")),
    dict(nombre="Martín", apellido="Gómez", telefono="11-5555-0002",
         sueldo_fijo=Decimal("0"), porcentaje_comision=Decimal("45")),
]

SERVICIOS = [
    dict(nombre="Corte", precio_base=Decimal("3500"), duracion_min=30,
         comision_pct=Decimal("40"), descripcion="Corte clásico o degradé"),
    dict(nombre="Barba", precio_base=Decimal("2000"), duracion_min=20,
         comision_pct=Decimal("40"), descripcion="Perfilado y alisado"),
    dict(nombre="Corte + barba", precio_base=Decimal("5000"), duracion_min=45,
         comision_pct=Decimal("40"), descripcion="Combo completo"),
    dict(nombre="Corte infantil", precio_base=Decimal("2800"), duracion_min=30,
         comision_pct=Decimal("35"), descripcion="Menores de 12 años"),
]

# (hora, barbero índice, servicio índice, cliente, teléfono, ¿completar?)
HORARIO_DE_HOY = [
    ("09:00", 0, 0, "Juan Pérez", "11-4444-1111", True),
    ("09:30", 1, 3, "Mateo Sánchez", "11-4444-2222", True),
    ("10:00", 0, 2, "Carlos Ruiz", "11-4444-3333", True),
    ("11:00", 1, 0, "Diego Sosa", None, True),
    ("12:00", 0, 1, "Fernando Lara", "11-4444-4444", True),
    ("16:00", 0, 0, "Tomás Vega", "11-4444-5555", False),
    ("16:30", 1, 1, "Ramiro Paz", None, False),
    ("17:00", 1, 2, "Nicolás Acosta", "11-4444-6666", False),
]

# Método de pago por servicio completado (rotando).
METODOS = ["efectivo", "transferencia", "tarjeta_debito", "mercado_pago", "tarjeta_credito"]


async def main() -> None:
    async with AsyncSessionLocal() as db:
        # --- barberos ---
        existentes = list((await db.execute(select(Barbero))).scalars().all())
        por_nombre = {(b.nombre, b.apellido): b for b in existentes}
        barberos = []
        for datos in BARBEROS:
            clave = (datos["nombre"], datos["apellido"])
            if clave in por_nombre:
                barberos.append(por_nombre[clave])
            else:
                barberos.append(await crud.barbero.create(db, obj_in=BarberoCreate(**datos)))
        print(f"Barberos: {len(barberos)}")

        # --- servicios ---
        tipos_existentes = list((await db.execute(select(TipoServicio))).scalars().all())
        por_nombre_t = {t.nombre: t for t in tipos_existentes}
        tipos = []
        for datos in SERVICIOS:
            if datos["nombre"] in por_nombre_t:
                tipos.append(por_nombre_t[datos["nombre"]])
            else:
                tipos.append(await crud.tipo_servicio.create(
                    db, obj_in=TipoServicioCreate(**datos)))
        print(f"Servicios: {len(tipos)}")

        # --- turnos de hoy ---
        inicio_del_dia = datetime.now(ART).replace(
            hour=0, minute=0, second=0, microsecond=0)
        turnos_hoy = list((await db.execute(
            select(Turno).where(Turno.fecha_hora >= inicio_del_dia)
        )).scalars().all())
        if turnos_hoy:
            print(f"Turnos de hoy ya existentes: {len(turnos_hoy)} (no se duplica)")
        else:
            for hora, i_barbero, i_tipo, cliente, tel, completar in HORARIO_DE_HOY:
                h, m = map(int, hora.split(":"))
                fecha = datetime.now(ART).replace(hour=h, minute=m, second=0, microsecond=0)
                await crud.turno.create(db, obj_in=TurnoCreate(
                    barbero_id=barberos[i_barbero].id,
                    tipo_servicio_id=tipos[i_tipo].id,
                    fecha_hora=fecha,
                    cliente_nombre=cliente,
                    cliente_telefono=tel,
                    notas="Datos de demostración" if completar else None,
                ))
            turnos_hoy = list((await db.execute(
                select(Turno).where(Turno.fecha_hora >= inicio_del_dia)
            )).scalars().all())
            print(f"Turnos creados: {len(turnos_hoy)}")

        # --- completar los marcados -> servicios realizados ---
        # La máquina de estados exige pendiente -> confirmado -> en_curso ->
        # completado: no se puede saltar directo a "completado". Idempotente:
        # los que ya están completados o cancelados se tocan.
        pendientes = [
            t for t in turnos_hoy
            if t.notas == "Datos de demostración"
            and t.estado in (EstadoTurno.pendiente, EstadoTurno.confirmado, EstadoTurno.en_curso)
        ]
        for turno in pendientes:
            if turno.estado == EstadoTurno.pendiente:
                await crud.turno.update(
                    db, db_obj=turno, obj_in=TurnoUpdate(estado=EstadoTurno.confirmado))
            if turno.estado == EstadoTurno.confirmado:
                await crud.turno.update(
                    db, db_obj=turno, obj_in=TurnoUpdate(estado=EstadoTurno.en_curso))
            await crud.turno.completar(db, turno_id=turno.id, body=TurnoCompletar())
        if pendientes:
            print(f"Turnos completados ahora: {len(pendientes)}")

        # --- pagos: nacen pendientes y pasan a pagado (solo si no existen) ---
        servicios_hoy_prev = list((await db.execute(
            select(ServicioRealizado).where(ServicioRealizado.fecha_hora >= inicio_del_dia)
        )).scalars().all())
        pagos_existentes = {
            p.servicio_realizado_id
            for p in (await db.execute(select(Pago))).scalars().all()
        }
        nuevos_pagos = 0
        for i, servicio in enumerate(servicios_hoy_prev):
            if servicio.id in pagos_existentes:
                continue
            pago = await crud.pago.create(db, obj_in=PagoCreate(
                servicio_realizado_id=servicio.id,
                metodo=METODOS[i % len(METODOS)],
                monto=servicio.precio_cobrado,
                referencia_externa=f"DEMO-{i + 1:03d}" if i % 2 else None,
            ))
            await crud.pago.update(db, db_obj=pago, obj_in=PagoUpdate(
                estado=EstadoPago.pagado))
            nuevos_pagos += 1
        print(f"Pagos nuevos: {nuevos_pagos}")

        # --- resumen ---
        servicios_hoy = list((await db.execute(
            select(ServicioRealizado).where(ServicioRealizado.fecha_hora >= inicio_del_dia)
        )).scalars().all())
        total = sum(float(s.precio_cobrado) for s in servicios_hoy)
        caja = await cierre_caja.get_caja_actual(db)

        print(f"Servicios de hoy: {len(servicios_hoy)}")
        print(f"Total facturado hoy: ${total:.2f}")
        print(f"Caja actual: facturado={caja.total_facturado} "
              f"comisiones={caja.total_comisiones_pagadas} "
              f"ganancia={caja.ganancia_barberia}")
        print("Listo. Entrá a la app y revisá Panel / Citas / Historial / Finanzas.")


if __name__ == "__main__":
    asyncio.run(main())
