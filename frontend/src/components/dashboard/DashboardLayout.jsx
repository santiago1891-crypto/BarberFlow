import { useEffect, useRef, useState } from "react";
import { Construction } from "lucide-react";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import CerrarCajaModal from "./CerrarCajaModal.jsx";
import PanelControl from "./views/PanelControl.jsx";
import Citas from "./views/Citas.jsx";
import Servicios from "./views/Servicios.jsx";
import Personal from "./views/Personal.jsx";
import HistorialVentas from "./views/HistorialVentas.jsx";
import Finanzas from "./views/Finanzas.jsx";
import { reportesApi } from "../../lib/resources.js";

const TITLES = {
  panel: "Panel de Control",
  citas: "Citas",
  servicios: "Servicios",
  personal: "Personal",
  historial: "Historial de Ventas",
  finanzas: "Finanzas",
  configuracion: "Configuración",
  ayuda: "Ayuda",
};

function Proximamente({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#6b6459]">
      <Construction size={26} />
      <p className="text-sm">{label} está en construcción.</p>
    </div>
  );
}

export default function DashboardLayout({ username, onLogout }) {
  const [view, setView] = useState("panel");
  const [search, setSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [cerrarCajaOpen, setCerrarCajaOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const citasRef = useRef(null);
  const serviciosRef = useRef(null);
  const historialRef = useRef(null);

  useEffect(() => {
    let alive = true;
    reportesApi
      .agendaHoy()
      .then((data) => {
        if (alive) setPendingCount(data.filter((t) => t.estado === "pendiente").length);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [view]);

  function navigate(id) {
    setView(id);
    setSearch("");
    setMobileNavOpen(false);
  }

  // Acción principal: registrar un servicio ya realizado (walk-in), el
  // corazón operativo del día a día de la barbería.
  function handleRegistrarServicio() {
    setView("historial");
    setMobileNavOpen(false);
    setTimeout(() => historialRef.current?.openCreate(), 60);
  }

  function handleNuevaCita() {
    setView("citas");
    setMobileNavOpen(false);
    setTimeout(() => citasRef.current?.openCreate(), 60);
  }

  function handleNuevoServicioCatalogo() {
    setView("servicios");
    setMobileNavOpen(false);
    setTimeout(() => serviciosRef.current?.openCreate(), 60);
  }

  return (
    <div className="min-h-screen bg-neutral flex">
      <Sidebar
        active={view}
        onNavigate={navigate}
        onRegistrarServicio={handleRegistrarServicio}
        onNuevaCita={handleNuevaCita}
        onNuevoServicioCatalogo={handleNuevoServicioCatalogo}
        username={username}
      />

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileNavOpen(false)} />
          <div className="relative animate-bf-pop">
            <Sidebar
              variant="mobile"
              active={view}
              onNavigate={navigate}
              onRegistrarServicio={handleRegistrarServicio}
              onNuevaCita={handleNuevaCita}
              onNuevoServicioCatalogo={handleNuevoServicioCatalogo}
              username={username}
              onClose={() => setMobileNavOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          search={search}
          onSearchChange={setSearch}
          pendingCount={pendingCount}
          username={username}
          onLogout={onLogout}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onOpenCerrarCaja={() => setCerrarCajaOpen(true)}
          pageTitle={TITLES[view]}
        />

        <main className="flex-1 p-4 md:p-6 max-w-[1400px] w-full mx-auto">
          <h1 className="md:hidden font-display text-xl text-[#F2EDE3] mb-4">{TITLES[view]}</h1>

          {view === "panel" && <PanelControl onNavigate={navigate} search={search} />}
          {view === "citas" && <Citas ref={citasRef} search={search} />}
          {view === "servicios" && <Servicios ref={serviciosRef} search={search} />}
          {view === "personal" && <Personal search={search} />}
          {view === "historial" && <HistorialVentas ref={historialRef} search={search} />}
          {view === "finanzas" && <Finanzas search={search} />}
          {view === "configuracion" && <Proximamente label="Configuración" />}
          {view === "ayuda" && <Proximamente label="Ayuda" />}
        </main>
      </div>

      <CerrarCajaModal open={cerrarCajaOpen} onClose={() => setCerrarCajaOpen(false)} />
    </div>
  );
}
