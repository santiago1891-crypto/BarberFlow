import { useState, useRef, useEffect } from "react";
import { Search, Bell, LogOut, Menu, ChevronDown, Lock } from "lucide-react";
import { initials } from "../../lib/format.js";

export default function Topbar({
  search,
  onSearchChange,
  pendingCount = 0,
  username,
  onLogout,
  onOpenMobileNav,
  onOpenCerrarCaja,
  pageTitle,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 py-3.5 bg-neutral/95 backdrop-blur border-b border-tertiary/70">
      <button
        onClick={onOpenMobileNav}
        className="md:hidden shrink-0 text-[#9C9488] hover:text-[#F2EDE3]"
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>

      <h1 className="hidden md:block font-display text-lg text-[#F2EDE3] shrink-0 mr-2">
        {pageTitle}
      </h1>

      <div className="relative flex-1 max-w-sm ml-auto md:ml-0">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6459]" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar en el panel…"
          className="bf-input w-full rounded-lg py-2 pl-9 pr-3 text-sm text-[#F2EDE3] bg-inputbg border border-tertiary transition-shadow"
        />
      </div>

      <div className="flex items-center gap-1.5 shrink-0" ref={menuRef}>
        <button
          onClick={onOpenCerrarCaja}
          className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-primary text-neutral hover:bg-primary-dark transition-colors mr-1"
        >
          <Lock size={13} />
          Cerrar Caja
        </button>

        <div className="relative">
          <button
            onClick={() => setBellOpen((v) => !v)}
            className="relative p-2 rounded-lg text-[#9C9488] hover:text-[#F2EDE3] hover:bg-tertiary/50 transition-colors"
            aria-label="Notificaciones"
          >
            <Bell size={17} />
            {pendingCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger" />
            )}
          </button>
          {bellOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-card border border-primary/[0.16] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)] p-3 animate-bf-pop">
              <p className="text-xs text-[#F2EDE3]">
                {pendingCount > 0
                  ? `Tenés ${pendingCount} turno${pendingCount === 1 ? "" : "s"} pendiente${
                      pendingCount === 1 ? "" : "s"
                    } hoy.`
                  : "No hay turnos pendientes por confirmar hoy."}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="relative flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-lg hover:bg-tertiary/50 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-primary text-neutral flex items-center justify-center text-[11px] font-bold font-mono shrink-0">
            {initials(username || "A", "")}
          </div>
          <span className="hidden sm:block text-sm text-[#F2EDE3] max-w-[100px] truncate">
            {username}
          </span>
          <ChevronDown size={14} className="text-[#6b6459]" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-14 mt-1 w-48 rounded-xl bg-card border border-primary/[0.16] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)] p-1.5 animate-bf-pop">
            <button
              onClick={() => {
                setMenuOpen(false);
                onOpenCerrarCaja();
              }}
              className="sm:hidden w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary hover:bg-primary-soft transition-colors"
            >
              <Lock size={15} />
              Cerrar caja
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger-soft transition-colors"
            >
              <LogOut size={15} />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
