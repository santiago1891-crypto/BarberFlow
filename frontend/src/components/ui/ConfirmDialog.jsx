import { AlertTriangle, Loader2 } from "lucide-react";
import Modal from "./Modal.jsx";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "¿Confirmás esta acción?",
  description,
  confirmLabel = "Confirmar",
  danger = true,
  loading = false,
}) {
  // Mientras corre la confirmación no se puede cerrar (botón Cancelar,
  // clic afuera ni Escape): si no, se perdía el estado de la acción.
  function handleRequestClose() {
    if (!loading) onClose?.();
  }

  return (
    <Modal open={open} onClose={handleRequestClose} title={title} maxWidth="max-w-sm">
      <div className="flex items-start gap-3 mb-5">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            danger ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary"
          }`}
        >
          <AlertTriangle size={16} />
        </div>
        <p className="text-sm text-[#9C9488] leading-relaxed">{description}</p>
      </div>
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={handleRequestClose}
          disabled={loading}
          className="text-sm px-4 py-2 rounded-lg border border-tertiary text-[#9C9488] hover:text-[#F2EDE3] hover:border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          aria-busy={loading}
          className={`text-sm px-4 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-70 ${
            danger ? "bg-danger text-[#F2EDE3]" : "bg-primary text-neutral"
          }`}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
