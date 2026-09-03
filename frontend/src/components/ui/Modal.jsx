import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, subtitle, children, footer, maxWidth = "max-w-md" }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 animate-bf-fade"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative w-full ${maxWidth} max-h-[88vh] overflow-y-auto rounded-2xl bg-card border border-primary/[0.16] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] animate-bf-pop`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-tertiary">
          <div>
            <h2 className="font-display text-lg text-[#F2EDE3]">{title}</h2>
            {subtitle && <p className="text-xs text-[#9C9488] mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-[#9C9488] hover:text-[#F2EDE3] hover:bg-tertiary/60 transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-1">{footer}</div>
        )}
      </div>
    </div>
  );
}
