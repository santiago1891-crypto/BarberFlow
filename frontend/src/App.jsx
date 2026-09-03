import { useEffect, useState } from "react";
import AuthPanel from "./components/AuthPanel.jsx";
import DashboardLayout from "./components/dashboard/DashboardLayout.jsx";
import ToastHost from "./components/ui/ToastHost.jsx";
import { getStoredSession, logout, onUnauthorized } from "./lib/auth.js";
import { toast } from "./lib/toast.js";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = todavía no se resolvió

  useEffect(() => {
    setSession(getStoredSession());
  }, []);

  useEffect(() => {
    onUnauthorized(() => {
      setSession(null);
      toast.error("Tu sesión expiró. Iniciá sesión de nuevo.");
    });
  }, []);

  function handleLogout() {
    logout();
    setSession(null);
  }

  if (session === undefined) {
    // Evita un parpadeo del login mientras se resuelve la sesión guardada.
    return <div className="min-h-screen bg-neutral" />;
  }

  if (!session) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center p-6 overflow-hidden bg-neutral">
        <div className="absolute inset-0 bg-[radial-gradient(#2C2C2C_1px,transparent_1px)] [background-size:22px_22px] [background-position:-8px_-8px]" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_28%,rgba(212,175,55,0.10)_0%,rgba(18,18,18,0)_70%)]" />
        <AuthPanel onAuthenticated={setSession} />
        <ToastHost />
      </div>
    );
  }

  return (
    <>
      <DashboardLayout username={session.username} onLogout={handleLogout} />
      <ToastHost />
    </>
  );
}
