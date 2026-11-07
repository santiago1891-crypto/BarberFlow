import { useEffect, useState } from "react";
import { AlertTriangle, CheckCheck, Info, Lock, RotateCcw } from "lucide-react";
import { cierresCajaApi } from "../../lib/resources.js";
import { formatMoney, formatTime, formatDateTime } from "../../lib/format.js";
import { toast } from "../../lib/toast.js";
import Modal from "../ui/Modal.jsx";
import { LoadingBlock, ErrorBlock } from "../ui/StateBlocks.jsx";

/**
 * Cierre de caja.
 *
 * Flujo: resumen de la caja actual -> confirmación -> caja cerrada. Al
 * confirmar, el BACKEND guarda los totales de ESA caja en el historial
 * (una fila por cierre en `cierres_caja`) y deja una caja nueva en $0 para
 * seguir vendiendo. `onCambioCierre` avisa afuera para que el Panel de
 * Control refresque los valores de la caja actual.
 *
 * Si ya hubo cierres hoy, se ofrece "Deshacer último cierre": devuelve
 * esos totales a la caja actual (borra la fila y vuelve a $0 si era el
 * único cierre de hoy).
 */
export default function CerrarCajaModal({ open, onClose, onCambioCierre }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [caja, setCaja] = useState(null); // CajaActual: la caja que está abierta
  const [cierre, setCierre] = useState(null); // CierreCajaRead recién guardado
  const [paso, setPaso] = useState("resumen"); // resumen | confirmar | cerrada
  // Mientras corre el request de cerrar/deshacer no se puede repetir la acción
  const [guardando, setGuardando] = useState(false);

  async function load({ silencioso = false } = {}) {
    if (!silencioso) setLoading(true);
    setError("");
    try {
      setCaja(await cierresCajaApi.actual());
    } catch (err) {
      // En una refetch silenciosa no se tapa la pantalla de confirmación
      // con un error: solo molesta si no hay nada cargado para mostrar.
      if (!silencioso || !caja) {
        setError(err.message || "No se pudo cargar la caja actual.");
      }
    } finally {
      if (!silencioso) setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    // Siempre arranca en "resumen": la caja nunca queda cerrada (cerrar
    // abre otra nueva en $0), así que no hay estado "cerrada" heredado.
    setCierre(null);
    setPaso("resumen");
    setGuardando(false);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cierra el modal solo si no hay una acción en curso (misma regla que
  // ConfirmDialog: si no, se pierde el estado del request).
  function handleRequestClose() {
    if (!guardando) onClose?.();
  }

  async function handleCerrar() {
    if (guardando) return;
    setGuardando(true);
    try {
      // El backend recalcula y guarda los totales de ESTA caja: lo que
      // queda registrado es lo del servidor, no lo que traía el modal.
      const guardado = await cierresCajaApi.cerrar();
      setCierre(guardado);
      setPaso("cerrada");
      toast.success(
        `Caja cerrada: ${formatMoney(guardado.total_facturado)} en ${guardado.cantidad_servicios} servicio${
          guardado.cantidad_servicios === 1 ? "" : "s"
        }. Se abrió una caja nueva en $0.`
      );
      onCambioCierre?.();
      // Refresca la caja actual (ahora es la nueva, en $0) sin tapar la
      // pantalla de confirmación con el spinner.
      load({ silencioso: true });
    } catch (err) {
      toast.error(err.message || "No se pudo cerrar la caja.");
    } finally {
      setGuardando(false);
    }
  }

  async function handleDeshacer() {
    if (guardando) return;
    setGuardando(true);
    try {
      await cierresCajaApi.deshacer();
      setCierre(null);
      setPaso("resumen");
      onCambioCierre?.();
      await load();
      toast.info("Último cierre deshecho: sus totales vuelven a la caja actual.");
    } catch (err) {
      toast.error(err.message || "No se pudo deshacer el último cierre.");
    } finally {
      setGuardando(false);
    }
  }

  const porBarbero = [...(caja?.por_barbero ?? [])].sort(
    (a, b) => Number(b.total_facturado) - Number(a.total_facturado)
  );
  // Caja sin ventas: no hay nada que guardar en el historial (el backend
  // también lo rechaza con 409).
  const cajaVacia = !!caja && caja.cantidad_servicios === 0 && Number(caja.total_facturado) === 0;
  const ultimo = caja?.ultimo_cierre;
  const hayParaDeshacer = !!cierre || !!ultimo;

  const btnSecundario =
    "text-sm px-4 py-2 rounded-lg border border-tertiary text-[#9C9488] hover:text-[#F2EDE3] hover:border-primary/30 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const btnPrimario =
    "text-sm px-4 py-2 rounded-lg font-semibold bg-primary text-neutral hover:bg-primary-dark transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";

  let footer;
  if (paso === "confirmar") {
    footer = (
      <>
        <button
          onClick={() => setPaso("resumen")}
          disabled={guardando}
          className={btnSecundario}
        >
          Volver
        </button>
        <button
          onClick={handleCerrar}
          disabled={guardando}
          aria-busy={guardando}
          className={btnPrimario}
        >
          <Lock size={14} />
          {guardando ? "Cerrando…" : "Sí, cerrar caja"}
        </button>
      </>
    );
  } else if (paso === "cerrada" && cierre) {
    footer = (
      <>
        {hayParaDeshacer && (
          <button
            onClick={handleDeshacer}
            disabled={guardando}
            className={btnSecundario}
          >
            <RotateCcw size={14} />
            Deshacer último cierre
          </button>
        )}
        <button
          onClick={() => onClose?.()}
          disabled={guardando}
          className={btnPrimario}
        >
          Listo
        </button>
      </>
    );
  } else {
    footer = (
      <>
        <button onClick={() => onClose?.()} disabled={guardando} className={btnSecundario}>
          Cancelar
        </button>
        <button
          onClick={() => setPaso("confirmar")}
          disabled={loading || !!error || !caja || cajaVacia || guardando}
          className={btnPrimario}
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
      onClose={handleRequestClose}
      title="Cerrar caja"
      subtitle={
        paso === "cerrada"
          ? "Cierre guardado en el historial"
          : paso === "confirmar"
            ? "Confirmar cierre"
            : "Resumen de la caja actual antes de cerrar"
      }
      maxWidth="max-w-lg"
      footer={footer}
    >
      {loading ? (
        <LoadingBlock label="Cargando la caja actual…" />
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

          <p className="text-xs text-[#9C9488] mt-3 leading-relaxed">
            Estos valores quedaron guardados en el historial (Finanzas) y se abrió una caja nueva en
            $0: ya podés seguir vendiendo y cerrarla cuando quieras.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paso === "confirmar" ? (
            <div className="flex items-start gap-3 rounded-xl bg-warning-soft border border-warning/30 p-4">
              <AlertTriangle size={17} className="text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#F2EDE3]">Vas a cerrar esta caja</p>
                <p className="text-xs text-[#9C9488] leading-relaxed mt-1">
                  Los {formatMoney(caja?.total_facturado)} facturados en{" "}
                  {caja?.cantidad_servicios ?? 0} servicio
                  {caja?.cantidad_servicios === 1 ? "" : "s"} se guardan en el historial de ganancias
                  y se abre una caja nueva en $0. Las ventas que registres después entran en la caja
                  nueva.
                </p>
              </div>
            </div>
          ) : (
            <>
              {cajaVacia && (
                <div className="flex items-start gap-2.5 rounded-lg bg-inputbg border border-tertiary px-3.5 py-3">
                  <Info size={16} className="text-[#6b6459] shrink-0 mt-0.5" />
                  <p className="text-sm text-[#9C9488]">
                    Esta caja todavía no tiene ventas: no hay nada que cerrar.
                  </p>
                </div>
              )}
              {ultimo && (
                <div className="flex items-center gap-2.5 rounded-lg bg-success-soft border border-success/30 px-3.5 py-3">
                  <CheckCheck size={16} className="text-success shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#F2EDE3]">
                      Último cierre de hoy: {formatTime(ultimo.cerrado_en)}
                    </p>
                    <p className="text-xs text-[#9C9488]">
                      {formatMoney(ultimo.ganancia_barberia)} de ganancia guardados en el historial.
                      Los valores de abajo son los de la caja nueva (desde ese cierre).
                    </p>
                  </div>
                  <button
                    onClick={handleDeshacer}
                    disabled={guardando}
                    title="Devolver ese cierre a la caja actual"
                    className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-success/40 text-success hover:bg-success/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Deshacer
                  </button>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-inputbg border border-tertiary p-3">
              <p className="font-mono text-[9px] uppercase tracking-wide text-[#6b6459] mb-1">Facturado</p>
              <p className="text-primary font-display text-lg">{formatMoney(caja?.total_facturado)}</p>
            </div>
            <div className="rounded-xl bg-inputbg border border-tertiary p-3">
              <p className="font-mono text-[9px] uppercase tracking-wide text-[#6b6459] mb-1">Servicios</p>
              <p className="text-[#F2EDE3] font-display text-lg">{caja?.cantidad_servicios ?? 0}</p>
            </div>
            <div className="rounded-xl bg-inputbg border border-tertiary p-3">
              <p className="font-mono text-[9px] uppercase tracking-wide text-[#6b6459] mb-1">Ganancia</p>
              <p className="text-success font-display text-lg">{formatMoney(caja?.ganancia_barberia)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-inputbg border border-tertiary px-3.5 py-2.5 text-sm">
            <span className="text-[#9C9488]">Comisiones de la caja</span>
            <span className="text-[#F2EDE3] font-semibold">
              {formatMoney(caja?.total_comisiones_pagadas)}
            </span>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-wide text-[#6b6459] mb-2">Por barbero</p>
            {porBarbero.length === 0 ? (
              <div className="flex items-center gap-2.5 rounded-lg bg-inputbg border border-tertiary px-3.5 py-3 text-sm text-[#9C9488]">
                <CheckCheck size={16} className="text-[#6b6459] shrink-0" />
                Todavía no se registró ningún servicio en esta caja.
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
