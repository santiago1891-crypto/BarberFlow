import { useEffect, useMemo, useState } from "react";
import { DollarSign, TrendingUp, Wallet, RefreshCcw } from "lucide-react";
import { reportesApi, pagosApi } from "../../../lib/resources.js";
import { formatMoney, formatDateTime, METODO_PAGO_LABEL } from "../../../lib/format.js";
import { toast } from "../../../lib/toast.js";
import StatCard from "../../ui/StatCard.jsx";
import Badge from "../../ui/Badge.jsx";
import { SelectInput } from "../../ui/Field.jsx";
import { LoadingBlock, EmptyBlock } from "../../ui/StateBlocks.jsx";

const ESTADO_META = {
  pendiente: { label: "Pendiente", variant: "warning" },
  pagado: { label: "Pagado", variant: "success" },
  reembolsado: { label: "Reembolsado", variant: "danger" },
};

const METODO_LABEL = METODO_PAGO_LABEL;

export default function Finanzas({ search }) {
  const [resumen, setResumen] = useState(null);
  const [comisiones, setComisiones] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [resumenRes, comisionesRes, pagosRes] = await Promise.all([
        reportesApi.gananciaBarberiaHoy(),
        reportesApi.comisionesMesActual(),
        pagosApi.list({ limit: 200, estado: estadoFiltro || undefined }),
      ]);
      setResumen(resumenRes);
      setComisiones(comisionesRes);
      setPagos(pagosRes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (err) {
      toast.error(err.message || "No se pudo cargar la sección de finanzas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoFiltro]);

  const filteredComisiones = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return comisiones;
    return comisiones.filter((c) => c.barbero.toLowerCase().includes(q));
  }, [comisiones, search]);

  async function marcarEstado(pago, estado) {
    setUpdatingId(pago.id);
    try {
      await pagosApi.update(pago.id, { estado });
      toast.success("Pago actualizado.");
      loadAll();
    } catch (err) {
      toast.error(err.message || "No se pudo actualizar el pago.");
    } finally {
      setUpdatingId(null);
    }
  }

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

      <div className="rounded-2xl bg-card border border-primary/[0.12] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-base text-[#F2EDE3]">Pagos</h3>
          <SelectInput
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="!py-1.5 !text-xs w-auto"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagado">Pagado</option>
            <option value="reembolsado">Reembolsado</option>
          </SelectInput>
        </div>

        {pagos.length === 0 ? (
          <EmptyBlock label="No hay pagos registrados. Se registran desde Historial de Ventas." />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wide text-[#6b6459] border-b border-tertiary">
                  <th className="px-2 py-2.5 font-medium">Fecha</th>
                  <th className="px-2 py-2.5 font-medium">Método</th>
                  <th className="px-2 py-2.5 font-medium">Referencia</th>
                  <th className="px-2 py-2.5 font-medium text-right">Monto</th>
                  <th className="px-2 py-2.5 font-medium">Estado</th>
                  <th className="px-2 py-2.5 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p) => {
                  const meta = ESTADO_META[p.estado] || ESTADO_META.pendiente;
                  return (
                    <tr key={p.id} className="border-b border-tertiary/60 last:border-0">
                      <td className="px-2 py-2.5 text-[#9C9488] whitespace-nowrap">
                        {formatDateTime(p.fecha_pago || p.created_at)}
                      </td>
                      <td className="px-2 py-2.5 text-[#9C9488]">{METODO_LABEL[p.metodo] || p.metodo}</td>
                      <td className="px-2 py-2.5 text-[#6b6459]">{p.referencia_externa || "—"}</td>
                      <td className="px-2 py-2.5 text-right text-[#F2EDE3] font-semibold">
                        {formatMoney(p.monto)}
                      </td>
                      <td className="px-2 py-2.5">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.estado !== "pagado" && (
                            <button
                              disabled={updatingId === p.id}
                              onClick={() => marcarEstado(p, "pagado")}
                              className="text-[11px] font-mono uppercase px-2 py-1 rounded-md text-success hover:bg-success-soft transition-colors disabled:opacity-50"
                            >
                              Marcar pagado
                            </button>
                          )}
                          {p.estado === "pagado" && (
                            <button
                              disabled={updatingId === p.id}
                              onClick={() => marcarEstado(p, "reembolsado")}
                              title="Reembolsar"
                              className="p-1.5 rounded-lg text-[#6b6459] hover:text-danger hover:bg-danger-soft transition-colors disabled:opacity-50"
                            >
                              <RefreshCcw size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
