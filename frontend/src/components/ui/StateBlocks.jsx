import { AlertTriangle, Loader2, Inbox } from "lucide-react";

export function LoadingBlock({ label = "Cargando…" }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-14 text-[#9C9488]">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyBlock({ label = "No hay datos todavía." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-14 text-[#6b6459]">
      <Inbox size={22} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

/**
 * Fallo de carga. Sin esto, las vistas mostraban sus valores por defecto
 * ($0.00 / "sin datos") como si fueran reales.
 */
export function ErrorBlock({ label = "No se pudieron cargar los datos.", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <AlertTriangle size={22} className="text-danger" />
      <span className="text-sm text-[#9C9488] max-w-sm">{label}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm px-4 py-2 rounded-lg border border-tertiary text-[#F2EDE3] hover:border-primary/40 hover:text-primary transition-colors"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
