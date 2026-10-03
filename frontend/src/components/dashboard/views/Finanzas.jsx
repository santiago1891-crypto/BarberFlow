import { useEffect, useMemo, useState } from "react";
import { DollarSign, TrendingUp, Wallet } from "lucide-react";
import { reportesApi } from "../../../lib/resources.js";
import { formatMoney } from "../../../lib/format.js";
import { toast } from "../../../lib/toast.js";
import StatCard from "../../ui/StatCard.jsx";
import { LoadingBlock, EmptyBlock } from "../../ui/StateBlocks.jsx";

export default function Finanzas({ search }) {
  const [resumen, setResumen] = useState(null);
  const [comisiones, setComisiones] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [resumenRes, comisionesRes] = await Promise.all([
        reportesApi.gananciaBarberiaHoy(),
        reportesApi.comisionesMesActual(),
      ]);
      setResumen(resumenRes);
      setComisiones(comisionesRes);
    } catch (err) {
      toast.error(err.message || "No se pudo cargar la sección de finanzas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filteredComisiones = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return comisiones;
    return comisiones.filter((c) => c.barbero.toLowerCase().includes(q));
  }, [comisiones, search]);

  if (loading) return <LoadingBlock label="Cargando finanzas…" />;

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
    </div>
  );
}
