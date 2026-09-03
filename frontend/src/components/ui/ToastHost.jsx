import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { subscribe } from "../../lib/toast.js";

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const COLORS = {
  success: { text: "text-success", border: "border-success/40", bg: "bg-success-soft" },
  error: { text: "text-danger", border: "border-danger/40", bg: "bg-danger-soft" },
  info: { text: "text-primary", border: "border-primary/40", bg: "bg-primary-soft" },
};

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return subscribe((t) => {
      setToasts((prev) => [...prev, t]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 4200);
    });
  }, []);

  function dismiss(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-xs">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info;
        const c = COLORS[t.type] || COLORS.info;
        return (
          <div
            key={t.id}
            className={`animate-bf-pop flex items-start gap-2.5 rounded-lg px-3.5 py-3 border ${c.border} ${c.bg} bg-card shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]`}
          >
            <Icon size={17} className={`mt-0.5 shrink-0 ${c.text}`} />
            <p className="text-[13px] leading-snug text-[#F2EDE3] flex-1">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="shrink-0 text-[#6b6459] hover:text-[#9C9488]">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
