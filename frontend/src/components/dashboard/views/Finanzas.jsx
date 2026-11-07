import { useEffect, useMemo, useState } from "react";
import { DollarSign, TrendingUp, Wallet } from "lucide-react";
import { reportesApi, cierresCajaApi } from "../../../lib/resources.js";
import { formatMoney, formatDateOnly, formatTime } from "../../../lib/format.js";
import StatCard from "../../ui/StatCard.jsx";
import { LoadingBlock, EmptyBlock, ErrorBlock } from "../../ui/StateBlocks.jsx";

export default function Finanzas({ search }) {
  const [resumen, setResumen] = useState(null);
  const [comisiones, setComisiones] = useState([]);
  const [cierres, setCierres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [resumenRes, comisionesRes, cierresRes] = await Promise.all([
        reportesApi.gananciaBarberiaHoy(),
        reportesApi.comisionesMesActual(),
        cierresCajaApi.list({ limit: 366 }),
      ]);
      setResumen(resumenRes);
      setComisiones(comisionesRes);
      setCierres(cierresRes);
    } catch (err) {
      // Antes el error se tragaba con un toast y la vista seguía mostrando
      // "$0.00 facturado" y "sin comisiones este mes" como si fueran ciertos.
      setError(err.message || "No se pudo cargar la sección de finanzas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredComisiones = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return comisiones;
    return comisiones.filter((c) => c.barbero.toLowerCase().includes(q));
  }, [comisiones, search]);

  // Totales acumulados del historial (un cierre por día)
  const totalesHistorial = useMemo(
    () =>
      cierres.reduce(
        (acc, c) => ({
          servicios: acc.servicios + Number(c.cantidad_servicios || 0),
          facturado: acc.facturado + Number(c.total_facturado || 0),
          comisiones: acc.comisiones + Number(c.total_comisiones_pagadas || 0),
          ganancia: acc.ganancia + Number(c.ganancia_barberia || 0),
        }),
        { servicios: 0, facturado: 0, comisiones: 0, ganancia: 0 }
      ),
    [cierres]
  );

  if (loading) return <LoadingBlock label="Cargando finanzas…" />;
  if (error) return <ErrorBlock label={error} onRetry={loadAll} />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={DollarSign}
          label="Facturado hoy"
          value={formatMoney(resumen?.total_facturado)}
          accent="primary"
        />
        <StatCard
          icon={TrendingUp}
          label="Comisiones pagadas hoy"
          value={formatMoney(resumen?.total_comisiones_pagadas)}
          accent="secondary"
        />
        <StatCard
          icon={Wallet}
          label="Ganancia barbería hoy"
          value={formatMoney(resumen?.ganancia_barberia)}
          accent="success"
        />
      </div>

      <div className="rounded-2xl bg-card border border-primary/[0.12] p-5">
        <h3 className="font-display text-base text-[#F2EDE3] mb-4">Comisiones — mes en curso</h3>
        {filteredComisiones.length === 0 ? (
          <EmptyBlock label="No hay comisiones registradas este mes." />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wide text-[#6b6459] border-b border-tertiary">
                  <th className="px-2 py-2.5 font-medium">Barbero</th>
                  <th className="px-2 py-2.5 font-medium text-right">Servicios</th>
                  <th className="px-2 py-2.5 font-medium text-right">Facturado</th>
                  <th className="px-2 py-2.5 font-medium text-right">Comisiones</th>
                  <th className="px-2 py-2.5 font-medium text-right">Sueldo fijo</th>
                  <th className="px-2 py-2.5 font-medium text-right">Ingreso total</th>
                </tr>
              </thead>
              <tbody>
                {filteredComisiones.map((c) => (
                  <tr key={c.barbero_id} className="border-b border-tertiary/60 last:border-0">
                    <td className="px-2 py-2.5 text-[#F2EDE3]">{c.barbero}</td>
                    <td className="px-2 py-2.5 text-right text-[#9C9488]">{c.servicios_realizados}</td>
                    <td className="px-2 py-2.5 text-right text-[#9C9488]">{formatMoney(c.total_facturado)}</td>
                    <td className="px-2 py-2.5 text-right text-[#9C9488]">{formatMoney(c.total_comisiones)}</td>
                    <td className="px-2 py-2.5 text-right text-[#9C9488]">{formatMoney(c.sueldo_fijo)}</td>
                    <td className="px-2 py-2.5 text-right text-primary font-semibold">
                      {formatMoney(c.ingreso_total_mes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historial: cada fila es una caja cerrada (un período; puede haber
          varias por día), guardado en el backend */}
      <div className="rounded-2xl bg-card border border-primary/[0.12] p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
          <h3 className="font-display text-base text-[#F2EDE3]">Historial de ganancias</h3>
          <span className="text-xs text-[#9C9488]">
            Total acumulado:{" "}
            <span className="text-success font-semibold">{formatMoney(totalesHistorial.ganancia)}</span>
          </span>
        </div>
        <p className="text-xs text-[#6b6459] mb-4">
          Cada fila es una caja cerrada: se guarda lo facturado hasta ese momento y la caja arranca
          de nuevo en $0.
        </p>
        {cierres.length === 0 ? (
          <EmptyBlock label="Todavía no cerraste ninguna caja: cuando la cierres, sus totales quedan guardados acá." />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wide text-[#6b6459] border-b border-tertiary">
                  <th className="px-2 py-2.5 font-medium">Fecha</th>
                  <th className="px-2 py-2.5 font-medium">Cerrada a las</th>
                  <th className="px-2 py-2.5 font-medium text-right">Servicios</th>
                  <th className="px-2 py-2.5 font-medium text-right">Facturado</th>
                  <th className="px-2 py-2.5 font-medium text-right">Comisiones</th>
                  <th className="px-2 py-2.5 font-medium text-right">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {cierres.map((c) => (
                  <tr key={c.id} className="border-b border-tertiary/60 last:border-0">
                    <td className="px-2 py-2.5 text-[#F2EDE3]">{formatDateOnly(c.fecha)}</td>
                    <td className="px-2 py-2.5 text-[#9C9488]">{formatTime(c.cerrado_en)}</td>
                    <td className="px-2 py-2.5 text-right text-[#9C9488]">{c.cantidad_servicios}</td>
                    <td className="px-2 py-2.5 text-right text-[#9C9488]">{formatMoney(c.total_facturado)}</td>
                    <td className="px-2 py-2.5 text-right text-[#9C9488]">
                      {formatMoney(c.total_comisiones_pagadas)}
                    </td>
                    <td className="px-2 py-2.5 text-right text-success font-semibold">
                      {formatMoney(c.ganancia_barberia)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-tertiary font-semibold">
                  <td className="px-2 py-2.5 text-[#F2EDE3]" colSpan={2}>
                    Total ({cierres.length} cierre{cierres.length === 1 ? "" : "s"})
                  </td>
                  <td className="px-2 py-2.5 text-right text-[#F2EDE3]">{totalesHistorial.servicios}</td>
                  <td className="px-2 py-2.5 text-right text-[#F2EDE3]">{formatMoney(totalesHistorial.facturado)}</td>
                  <td className="px-2 py-2.5 text-right text-[#F2EDE3]">
                    {formatMoney(totalesHistorial.comisiones)}
                  </td>
                  <td className="px-2 py-2.5 text-right text-success">{formatMoney(totalesHistorial.ganancia)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
