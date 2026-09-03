import { Loader2, Inbox } from "lucide-react";

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
