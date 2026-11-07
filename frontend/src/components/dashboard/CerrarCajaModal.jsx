import { useEffect, useState } from "react";
import { AlertTriangle, CheckCheck, Lock, RotateCcw } from "lucide-react";
import { reportesApi } from "../../lib/resources.js";
import { formatMoney, formatTime, formatDateTime } from "../../lib/format.js";
import { getCierreDeHoy, guardarCierre, limpiarCierre } from "../../lib/cierreCaja.js";
import { toast } from "../../lib/toast.js";
import Modal from "../ui/Modal.jsx";
import { LoadingBlock, ErrorBlock } from "../ui/StateBlocks.jsx";


export default function CerrarCajaModal({ open, onClose, onCambioCierre }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resumen, setResumen] = useState(null);
  const [porBarbero, setPorBarbero] = useState([]);
  const [cierre, setCierre] = useState(null);
  const [paso, setPaso] = useState("resumen"); // resumen | confirmar | cerrada

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [resumenRes, barberosRes] = await Promise.all([
        reportesApi.gananciaBarberiaHoy(),
        reportesApi.gananciasBarberosHoy(),
      ]);
      setResumen(resumenRes);
      setPorBarbero(
        [...barberosRes].sort((a, b) => Number(b.total_facturado) - Number(a.total_facturado))
      );
    } catch (err) {
      setError(err.message || "No se pudo cargar el resumen del día.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setCierre(getCierreDeHoy());
    setPaso("resumen");
    load();
  }, [open]);

  function notificar(nuevoCierre) {
    setCierre(nuevoCierre);
    onCambioCierre?.(nuevoCierre);
  }

  function handleCerrar() {
    let guardado;
    try {
      guardado = guardarCierre(resumen);
    } catch {
      toast.error("No se pudo guardar el cierre en este navegador.");
      return;
    }
    setPaso("cerrada");
    toast.success(
      `Caja cerrada: ${formatMoney(guardado.total_facturado)} en ${guardado.cantidad_servicios} servicio${
        guardado.cantidad_servicios === 1 ? "" : "s"
      }.`
    );
    notificar(guardado);
  }

  function handleReabrir() {
    limpiarCierre();
    notificar(null);
    setPaso("resumen");
    toast.info("Caja reabierta: ya podés seguir registrando ventas y cerrarla más tarde.");
    load();
  }

  function handleListo() {
    onClose?.();
  }

  const cerrada = !!cierre;
  const horaCierre = cierre ? formatTime(cierre.cerrado_en) : "";

  const footerCerrada = (
    <>
      <button
        onClick={handleReabrir}
        className="text-sm px-4 py-2 rounded-lg border border-tertiary text-[#9C9488] hover:text-[#F2EDE3] hover:border-primary/30 transition-colors flex items-center gap-2"
      >
        <RotateCcw size={14} />
        Reabrir caja
      </button>
      <button
        onClick={handleListo}
        className="text-sm px-4 py-2 rounded-lg font-semibold bg-primary text-neutral hover:bg-primary-dark transition-colors"
      >
        Listo
      </button>
    </>
  );

  let footer;
  if (paso === "confirmar") {
    footer = (
      <>
        <button
          onClick={() => setPaso("resumen")}
          className="text-sm px-4 py-2 rounded-lg border border-tertiary text-[#9C9488] hover:text-[#F2EDE3] hover:border-primary/30 transition-colors"
        >
          Volver
        </button>
        <button
          onClick={handleCerrar}
          className="text-sm px-4 py-2 rounded-lg font-semibold bg-primary text-neutral hover:bg-primary-dark transition-colors flex items-center gap-2"
        >
          <Lock size={14} />
          Sí, cerrar caja
        </button>
      </>
    );
  } else if (paso === "cerrada" || cerrada) {
    footer = footerCerrada;
  } else {
    footer = (
      <>
        <button
          onClick={onClose}
          className="text-sm px-4 py-2 rounded-lg border border-tertiary text-[#9C9488] hover:text-[#F2EDE3] hover:border-primary/30 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={() => setPaso("confirmar")}
          disabled={loading || !!error || !resumen}
          className="text-sm px-4 py-2 rounded-lg font-semibold bg-primary text-neutral hover:bg-primary-dark transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Lock size={14} />
          Cerrar caja
        </button>
      </>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cerrar caja"
      subtitle={cerrada && paso !== "resumen" ? "Cierre del día registrado" : "Resumen del día antes de cerrar"}
      maxWidth="max-w-lg"
      footer={footer}
    >
      {loading ? (
        <LoadingBlock label="Calculando el cierre del día…" />
      ) : error ? (
        <ErrorBlock label={error} onRetry={load} />
      ) : paso === "cerrada" && cierre ? (
        <div className="flex flex-col items-center text-center gap-1.5 py-2">
          <div className="w-11 h-11 rounded-full bg-success-soft text-success flex items-center justify-center mb-1">
            <CheckCheck size={20} />
          </div>
          <p className="font-display text-lg text-[#F2EDE3]">Caja cerrada</p>
          <p className="text-xs text-[#9C9488]">{formatDateTime(cierre.cerrado_en)}</p>

          <div className="grid grid-cols-2 gap-2.5 w-full mt-4">
            <div className="rounded-xl bg-inputbg border border-tertiary p-3 text-left">
              <p className="font-mono text-[9px] uppercase tracking-wide text-[#6b6459] mb-1">Facturado</p>
              <p className="text-primary font-display text-lg">{formatMoney(cierre.total_facturado)}</p>
            </div>
            <div className="rounded-xl bg-inputbg border border-tertiary p-3 text-left">
              <p className="font-mono text-[9px] uppercase tracking-wide text-[#6b6459] mb-1">Servicios</p>
              <p className="text-[#F2EDE3] font-display text-lg">{cierre.cantidad_servicios}</p>
            </div>
            <div className="rounded-xl bg-inputbg border border-tertiary p-3 text-left">
              <p className="font-mono text-[9px] uppercase tracking-wide text-[#6b6459] mb-1">Comisiones</p>
              <p className="text-[#F2EDE3] font-display text-lg">
                {formatMoney(cierre.total_comisiones_pagadas)}
              </p>
            </div>
            <div className="rounded-xl bg-inputbg border border-tertiary p-3 text-left">
              <p className="font-mono text-[9px] uppercase tracking-wide text-[#6b6459] mb-1">Ganancia</p>
              <p className="text-success font-display text-lg">{formatMoney(cierre.ganancia_barberia)}</p>
            </div>
          </div>

          <p className="text-xs text-[#6b6459] mt-3">
            Si seguís vendiendo, reabrí la caja para que esas ventas entren al resumen del día.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paso === "confirmar" ? (
            <div className="flex items-start gap-3 rounded-xl bg-warning-soft border border-warning/30 p-4">
              <AlertTriangle size={17} className="text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#F2EDE3]">Vas a cerrar la caja de hoy</p>
                <p className="text-xs text-[#9C9488] leading-relaxed mt-1">
                  Quedaría cerrada a las {formatTime(new Date())} con{" "}
                  {formatMoney(resumen?.total_facturado)} facturados en{" "}
                  {resumen?.cantidad_servicios ?? 0} servicio
                  {resumen?.cantidad_servicios === 1 ? "" : "s"}. Las ventas que registres después no van a
                  entrar en este cierre, y hasta que la reabras el Topbar va a mostrar "Caja cerrada".
                </p>
              </div>
            </div>
          ) : (
            cerrada && (
              <div className="flex items-center gap-2.5 rounded-lg bg-success-soft border border-success/30 px-3.5 py-3">
                <CheckCheck size={16} className="text-success shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#F2EDE3]">Caja cerrada a las {horaCierre}</p>
                  <p className="text-xs text-[#9C9488]">
                    Cerraste con {formatMoney(cierre.total_facturado)} facturados.
                  </p>
                </div>
              </div>
            )
          )}

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
            <span className="text-[#F2EDE3] font-semibold">
              {formatMoney(resumen?.total_comisiones_pagadas)}
            </span>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-wide text-[#6b6459] mb-2">Por barbero</p>
            {porBarbero.length === 0 ? (
              <div className="flex items-center gap-2.5 rounded-lg bg-inputbg border border-tertiary px-3.5 py-3 text-sm text-[#9C9488]">
                <CheckCheck size={16} className="text-[#6b6459] shrink-0" />
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
