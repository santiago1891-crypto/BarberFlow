import { useEffect, useMemo, useState } from "react";
import { Lock, DollarSign, Clock3, CheckCheck, Loader2 } from "lucide-react";
import { reportesApi, pagosApi } from "../../lib/resources.js";
import { formatMoney, METODO_PAGO_LABEL, isToday } from "../../lib/format.js";
import { toast } from "../../lib/toast.js";
import Modal from "../ui/Modal.jsx";
import { LoadingBlock } from "../ui/StateBlocks.jsx";

export default function CerrarCajaModal({ open, onClose }) {
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState(null);
  const [pagosPendientesHoy, setPagosPendientesHoy] = useState([]);
  const [pagosCobradosHoy, setPagosCobradosHoy] = useState([]);
  const [closing, setClosing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [resumenRes, pendientes, pagados] = await Promise.all([
        reportesApi.gananciaBarberiaHoy(),
        pagosApi.list({ estado: "pendiente", limit: 200 }),
        pagosApi.list({ estado: "pagado", limit: 200 }),
      ]);
      setResumen(resumenRes);
      setPagosPendientesHoy(pendientes.filter((p) => isToday(p.fecha_pago || p.created_at)));
      setPagosCobradosHoy(pagados.filter((p) => isToday(p.fecha_pago || p.created_at)));
    } catch (err) {
      toast.error(err.message || "No se pudo cargar el resumen de caja.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const porMetodoPendiente = useMemo(() => {
    const map = new Map();
    for (const p of pagosPendientesHoy) {
      const prev = map.get(p.metodo) || { count: 0, total: 0 };
      map.set(p.metodo, { count: prev.count + 1, total: prev.total + Number(p.monto) });
    }
    return map;
  }, [pagosPendientesHoy]);

  const totalCobradoHoy = useMemo(
    () => pagosCobradosHoy.reduce((acc, p) => acc + Number(p.monto), 0),
    [pagosCobradosHoy]
  );
  const totalPendienteHoy = useMemo(
    () => pagosPendientesHoy.reduce((acc, p) => acc + Number(p.monto), 0),
    [pagosPendientesHoy]
  );

  async function handleCerrarCaja() {
    if (pagosPendientesHoy.length === 0) {
      onClose();
      return;
    }
    setClosing(true);
    const results = await Promise.allSettled(
      pagosPendientesHoy.map((p) => pagosApi.update(p.id, { estado: "pagado" }))
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const fail = results.length - ok;

    if (fail === 0) {
      toast.success(`Caja cerrada: ${ok} pago${ok === 1 ? "" : "s"} marcado${ok === 1 ? "" : "s"} como cobrado.`);
      onClose();
    } else {
      toast.error(`Se marcaron ${ok} pagos, pero ${fail} fallaron. Revisá Finanzas para los detalles.`);
      load();
    }
    setClosing(false);
  }

  return (
    <Modal
      open={open}
      onClose={() => !closing && onClose()}
      title="Cerrar caja"
      subtitle="Concilia y marca como cobrados los pagos pendientes de hoy"
      maxWidth="max-w-lg"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={closing}
            className="text-sm px-4 py-2 rounded-lg border border-tertiary text-[#9C9488] hover:text-[#F2EDE3] hover:border-primary/30 transition-colors"
          >
            Cerrar sin marcar
          </button>
          <button
            onClick={handleCerrarCaja}
            disabled={closing || loading || pagosPendientesHoy.length === 0}
            className="text-sm px-4 py-2 rounded-lg font-semibold bg-primary text-neutral disabled:opacity-50 flex items-center gap-2"
          >
            {closing ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            {pagosPendientesHoy.length === 0
              ? "No hay pendientes"
              : `Cerrar caja (${pagosPendientesHoy.length})`}
          </button>
        </>
      }
    >
      {loading ? (
        <LoadingBlock label="Calculando el cierre del día…" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-inputbg border border-tertiary p-3">
              <p className="font-mono text-[9px] uppercase tracking-wide text-[#6b6459] mb-1">Facturado hoy</p>
              <p className="text-primary font-display text-lg">{formatMoney(resumen?.total_facturado)}</p>
            </div>
            <div className="rounded-xl bg-inputbg border border-tertiary p-3">
              <p className="font-mono text-[9px] uppercase tracking-wide text-[#6b6459] mb-1">Ya cobrado</p>
              <p className="text-success font-display text-lg">{formatMoney(totalCobradoHoy)}</p>
            </div>
            <div className="rounded-xl bg-inputbg border border-tertiary p-3">
              <p className="font-mono text-[9px] uppercase tracking-wide text-[#6b6459] mb-1">Pendiente</p>
              <p className="text-warning font-display text-lg">{formatMoney(totalPendienteHoy)}</p>
            </div>
          </div>

          {pagosPendientesHoy.length === 0 ? (
            <div className="flex items-center gap-2.5 rounded-lg bg-success-soft border border-success/30 px-3.5 py-3 text-sm text-[#F2EDE3]">
              <CheckCheck size={16} className="text-success shrink-0" />
              No hay pagos pendientes de hoy. La caja ya está al día.
            </div>
          ) : (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wide text-[#6b6459] mb-2">
                Pendientes por método de pago
              </p>
              <div className="space-y-1.5">
                {[...porMetodoPendiente.entries()].map(([metodo, { count, total }]) => (
                  <div
                    key={metodo}
                    className="flex items-center justify-between rounded-lg bg-warning-soft border border-warning/30 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2 text-[#F2EDE3]">
                      <Clock3 size={13} className="text-warning" />
                      {METODO_PAGO_LABEL[metodo] || metodo}
                      <span className="text-[#6b6459] text-xs">
                        ({count} pago{count === 1 ? "" : "s"})
                      </span>
                    </span>
                    <span className="text-warning font-semibold">{formatMoney(total)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#6b6459] mt-3 flex items-start gap-1.5">
                <DollarSign size={13} className="shrink-0 mt-0.5" />
                Al cerrar la caja, estos pagos se marcan como "pagado". Usalo cuando ya
                verificaste que el efectivo/las transferencias entraron correctamente.
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
