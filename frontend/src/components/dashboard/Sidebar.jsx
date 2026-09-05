import {
  Scissors,
  Gauge,
  CalendarDays,
  Users,
  Receipt,
  Wallet,
  Settings,
  HelpCircle,
  Plus,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "panel", label: "Panel de Control", icon: Gauge },
  { id: "citas", label: "Citas", icon: CalendarDays },
  { id: "servicios", label: "Servicios", icon: Scissors },
  { id: "personal", label: "Personal", icon: Users },
  { id: "historial", label: "Historial de Ventas", icon: Receipt },
  { id: "finanzas", label: "Finanzas", icon: Wallet },
];

export default function Sidebar({
  active,
  onNavigate,
  onNuevaCita,
  onNuevoServicio,
  username,
  variant = "desktop",
  onClose,
}) {
  const wrapperClass =
    variant === "desktop"
      ? "hidden md:flex w-64 shrink-0 flex-col bg-card border-r border-primary/[0.12] h-screen sticky top-0"
      : "relative flex w-72 max-w-[80vw] flex-col bg-card h-screen";

  return (
    <aside className={wrapperClass}>
      {variant === "mobile" && (
        <button
          onClick={onClose}
          className="absolute top-4 right-3 p-1.5 rounded-lg text-[#9C9488] hover:text-[#F2EDE3]"
          aria-label="Cerrar menú"
        >
          <X size={18} />
        </button>
      )}
      <div className="px-5 pt-6 pb-5 border-b border-tertiary/70">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary shrink-0">
            <Scissors size={17} className="text-neutral" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-base text-[#F2EDE3] leading-tight truncate">BarberFlow</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-secondary truncate">
              {username || "admin"}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <li key={id}>
                <button
                  onClick={() => onNavigate(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-neutral font-semibold"
                      : "text-[#9C9488] hover:text-[#F2EDE3] hover:bg-tertiary/50"
                  }`}
                >
                  <Icon size={16} strokeWidth={2.1} />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-3 pb-4 space-y-2">
        <button
          onClick={onNuevaCita}
          className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold bg-primary text-neutral hover:bg-primary-dark transition-colors"
        >
          <Plus size={16} strokeWidth={2.5} />
          Nueva Cita
        </button>
        <button
          onClick={onNuevoServicio}
          className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold bg-transparent border border-primary/40 text-primary hover:bg-primary-soft transition-colors"
        >
          <Plus size={16} strokeWidth={2.5} />
          Nuevo Servicio
        </button>
      </div>

      <div className="px-3 pb-5 pt-3 border-t border-tertiary/70 space-y-1">
        <button
          onClick={() => onNavigate("configuracion")}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#6b6459] hover:text-[#9C9488] transition-colors"
        >
          <Settings size={15} />
          Configuración
        </button>
        <button
          onClick={() => onNavigate("ayuda")}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#6b6459] hover:text-[#9C9488] transition-colors"
        >
          <HelpCircle size={15} />
          Ayuda
        </button>
      </div>
    </aside>
  );
}
