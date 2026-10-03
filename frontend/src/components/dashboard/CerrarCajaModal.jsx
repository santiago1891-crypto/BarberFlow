import { useEffect, useState } from "react";
import { Lock, CheckCheck } from "lucide-react";
import { reportesApi } from "../../lib/resources.js";
import { formatMoney } from "../../lib/format.js";
import { toast } from "../../lib/toast.js";
import Modal from "../ui/Modal.jsx";
import { LoadingBlock } from "../ui/StateBlocks.jsx";

/**
 * Resumen de cierre del día: cuánto se facturó, cuántos servicios se
 * hicieron y cómo le fue a cada barbero hoy. Es de solo lectura — no
 * modifica nada en el backend, es para repasar antes de cerrar el local.
 */
export default function CerrarCajaModal({ open, onClose }) {
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState(null);
  const [porBarbero, setPorBarbero] = useState([]);

  async function load() {
    setLoading(true);
    try {
      const [resumenRes, barberosRes] = await Promise.all([
        reportesApi.gananciaBarberiaHoy(),
        reportesApi.gananciasBarberosHoy(),
      ]);
      setResumen(resumenRes);
      setPorBarbero([...barberosRes].sort((a, b) => Number(b.total_facturado) - Number(a.total_facturado)));
    } catch (err) {
      toast.error(err.message || "No se pudo cargar el resumen del día.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) load();
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cerrar caja"
      subtitle="Resumen del día antes de cerrar"
      maxWidth="max-w-lg"
      footer={
        <button
          onClick={onClose}
          className="text-sm px-4 py-2 rounded-lg font-semibold bg-primary text-neutral flex items-center gap-2"
        >
          <Lock size={14} />
          Cerrar caja
        </button>
      }
    >
      {loading ? (
        <LoadingBlock label="Calculando el cierre del día…" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-inputbg border border-tertiary p-3">
              <p className="font-mono text-[9px] uppercase tracking-wide text-[#6b6459] mb-1">Facturado</p>
              <p className="text-primary font-display text-lg">{formatMoney(resumen?.total_facturado)}</p>
            </div>
            <div className="rounded-xl bg-inputbg border border-tertiary p-3">
              <p className="font-mono text-[9px] uppercase tracking-wide text-[#6b6459] mb-1">Servicios</p>
              <p className="text-[#F2EDE3] font-display text-lg">{resumen?.cantidad_servicios ?? 0}</p>
            </div>
            <div className="rounded-xl bg-inputbg border border-tertiary p-3">
              <p className="font-mono text-[9px] uppercase tracking-wide text-[#6b6459] mb-1">Ganancia</p>
              <p className="text-success font-display text-lg">{formatMoney(resumen?.ganancia_barberia)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-inputbg border border-tertiary px-3.5 py-2.5 text-sm">
            <span className="text-[#9C9488]">Comisiones del día</span>
            <span className="text-[#F2EDE3] font-semibold">{formatMoney(resumen?.total_comisiones_pagadas)}</span>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-wide text-[#6b6459] mb-2">Por barbero</p>
            {porBarbero.length === 0 ? (
              <div className="flex items-center gap-2.5 rounded-lg bg-success-soft border border-success/30 px-3.5 py-3 text-sm text-[#F2EDE3]">
                <CheckCheck size={16} className="text-success shrink-0" />
                Todavía no se registró ningún servicio hoy.
              </div>
            ) : (
              <div className="space-y-1.5">
                {porBarbero.map((b) => (
                  <div
                    key={b.barbero_id}
                    className="flex items-center justify-between rounded-lg bg-inputbg border border-tertiary px-3 py-2 text-sm"
                  >
                    <span className="text-[#F2EDE3]">
                      {b.barbero}{" "}
                      <span className="text-[#6b6459] text-xs">
                        ({b.cantidad_servicios} servicio{b.cantidad_servicios === 1 ? "" : "s"})
                      </span>
                    </span>
                    <span className="text-primary font-semibold">{formatMoney(b.total_facturado)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
