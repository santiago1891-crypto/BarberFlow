import { useEffect, useState, useMemo, useRef } from "react";
import { DollarSign, Users, Scissors, TrendingUp, Pencil, CheckCheck } from "lucide-react";
import { barberosApi, reportesApi, cierresCajaApi } from "../../../lib/resources.js";
import { formatMoney, formatTime, initials } from "../../../lib/format.js";
import { computeBarberStatuses, fullName } from "../../../lib/barberStatus.js";
import StatCard from "../../ui/StatCard.jsx";
import Badge from "../../ui/Badge.jsx";
import { LoadingBlock, EmptyBlock, ErrorBlock } from "../../ui/StateBlocks.jsx";

export default function PanelControl({ onNavigate, search, tick = 0 }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Caja ABIERTA ahora: lo facturado hoy menos lo que ya se cerró. Al
  // cerrar, esos totales pasan al historial y esta vuelve a $0.
  const [caja, setCaja] = useState(null);
  const [barberos, setBarberos] = useState([]);
  const [agendaHoy, setAgendaHoy] = useState([]);

  // Evita escribir estado después de desmontar (o de un reintento más nuevo).
  const aliveRef = useRef(true);

  async function load({ silencioso = false } = {}) {
    if (!silencioso) setLoading(true);
    setError("");
    try {
      const [cajaRes, barberosRes, agendaRes] = await Promise.all([
        cierresCajaApi.actual(),
        barberosApi.list({ limit: 200 }),
        reportesApi.agendaHoy(),
      ]);
      if (!aliveRef.current) return;
      setCaja(cajaRes);
      setBarberos(barberosRes);
      setAgendaHoy(agendaRes);
    } catch (err) {
      if (!aliveRef.current) return;
      // Sin esto la vista quedaba en $0.00 / "sin servicios hoy" como si
      // fuera un día sin movimiento.
      setError(err.message || "No se pudo cargar el panel de control.");
    } finally {
      if (aliveRef.current && !silencioso) setLoading(false);
    }
  }

  useEffect(() => {
    aliveRef.current = true;
    load();
    return () => {
      aliveRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cerró (o deshizo) una caja: refrescá los valores sin recargar la vista
  // entera. El Panel puede estar desmontado (otra vista); al volver a
  // montar ya pide los datos frescos.
  const tickRef = useRef(tick);
  useEffect(() => {
    if (tickRef.current === tick) return;
    tickRef.current = tick;
    load({ silencioso: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const statusMap = useMemo(() => computeBarberStatuses(barberos, agendaHoy), [barberos, agendaHoy]);

  const topBarberos = useMemo(
    () =>
      [...(caja?.por_barbero ?? [])]
        .sort((a, b) => Number(b.total_facturado) - Number(a.total_facturado))
        .slice(0, 3),
    [caja]
  );

  const barberosPorId = useMemo(() => new Map(barberos.map((b) => [b.id, b])), [barberos]);

  const filteredPersonal = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    const list = q ? barberos.filter((b) => fullName(b).toLowerCase().includes(q)) : barberos;
    return list.slice(0, 5);
  }, [barberos, search]);

  if (loading) return <LoadingBlock label="Cargando panel de control…" />;
  if (error) return <ErrorBlock label={error} onRetry={load} />;

  const ultimoCierre = caja?.ultimo_cierre;

  return (
    <div className="space-y-6">
      {/* Ya hubo cierres hoy: aviso + valores de la caja actual (desde el
          último cierre); el detalle de cada cierre está en Finanzas. */}
      {ultimoCierre && (
        <div className="flex items-center gap-2.5 rounded-xl bg-success-soft border border-success/30 px-4 py-3">
          <CheckCheck size={16} className="text-success shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#F2EDE3]">
              Último cierre de hoy a las {formatTime(ultimoCierre.cerrado_en)} —{" "}
              {formatMoney(ultimoCierre.ganancia_barberia)} de ganancia
            </p>
            <p className="text-xs text-[#9C9488]">
              Guardado en el historial. Los valores de abajo son los de la caja actual (desde ese
              cierre); el historial completo está en Finanzas.
            </p>
          </div>
        </div>
      )}

      {/* Stats de la caja actual */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={DollarSign}
          label="Ganancia caja actual"
          value={formatMoney(caja?.ganancia_barberia)}
          sublabel={`Facturado: ${formatMoney(caja?.total_facturado)}`}
          accent="primary"
        />
        <StatCard
          icon={Scissors}
          label="Servicios caja actual"
          value={caja?.cantidad_servicios ?? 0}
          sublabel="Cortes y servicios realizados"
          accent="secondary"
        />
        <StatCard
          icon={TrendingUp}
          label="Comisiones caja actual"
          value={formatMoney(caja?.total_comisiones_pagadas)}
          sublabel="A los barberos, sobre lo facturado"
          accent="success"
        />
      </div>

      {/* Rendimiento operativo */}
      <div className="rounded-2xl bg-card border border-primary/[0.12] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-base text-[#F2EDE3]">Rendimiento operativo</h3>
          <button
            onClick={() => onNavigate("personal")}
            className="font-mono text-[10px] uppercase tracking-wide text-primary hover:opacity-80"
          >
            Ver todos
          </button>
        </div>

        {topBarberos.length === 0 ? (
          <EmptyBlock label="Todavía no hay servicios en esta caja." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topBarberos.map((g) => {
              const status = statusMap.get(g.barbero_id);
              return (
                <div
                  key={g.barbero_id}
                  className="rounded-xl bg-inputbg border border-tertiary p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-[11px] font-mono font-bold text-[#F2EDE3] shrink-0">
                      {initials(...g.barbero.split(" "))}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-[#F2EDE3] truncate">{g.barbero}</p>
                      {status && (
                        <Badge variant={status.variant} pulse={status.pulse}>
                          {status.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[#6b6459] font-mono uppercase text-[9px] tracking-wide">Turnos</p>
                      <p className="text-[#F2EDE3] font-semibold">{g.cantidad_servicios}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#6b6459] font-mono uppercase text-[9px] tracking-wide">Facturado</p>
                      <p className="text-primary font-semibold">{formatMoney(g.total_facturado)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Gestión de personal (preview) */}
      <div className="rounded-2xl bg-card border border-primary/[0.12] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-base text-[#F2EDE3]">Gestión de personal</h3>
          <button
            onClick={() => onNavigate("personal")}
            className="font-mono text-[10px] uppercase tracking-wide text-primary hover:opacity-80"
          >
            Ver todos
          </button>
        </div>

        {filteredPersonal.length === 0 ? (
          <EmptyBlock label="No se encontraron barberos." />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wide text-[#6b6459] border-b border-tertiary">
                  <th className="px-2 py-2 font-medium">Barbero</th>
                  <th className="px-2 py-2 font-medium">Comisión</th>
                  <th className="px-2 py-2 font-medium">Estado</th>
                  <th className="px-2 py-2 font-medium text-right">Editar</th>
                </tr>
              </thead>
              <tbody>
                {filteredPersonal.map((b) => (
                  <tr key={b.id} className="border-b border-tertiary/60 last:border-0">
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-tertiary flex items-center justify-center text-[10px] font-mono text-[#F2EDE3] shrink-0">
                          {initials(b.nombre, b.apellido)}
                        </div>
                        <span className="text-[#F2EDE3]">{fullName(b)}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-[#9C9488]">{Number(b.porcentaje_comision)}%</td>
                    <td className="px-2 py-2.5">
                      <Badge variant={b.activo ? "success" : "danger"}>
                        {b.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <button
                        onClick={() => onNavigate("personal")}
                        className="text-[#6b6459] hover:text-primary transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
