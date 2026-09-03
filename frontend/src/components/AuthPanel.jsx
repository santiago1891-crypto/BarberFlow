import { useState, useEffect, useRef } from "react";
import {
  Scissors,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { login, logout as authLogout, getStoredSession } from "../lib/auth.js";

function FieldLabel({ children }) {
  return (
    <label className="block mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#9C9488]">
      {children}
    </label>
  );
}

export default function AuthPanel() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [session, setSession] = useState(null);
  const usernameRef = useRef(null);

  useEffect(() => {
    const stored = getStoredSession();
    if (stored) {
      setSession(stored);
    } else {
      usernameRef.current?.focus();
    }
  }, []);

  function triggerShake() {
    setShake(true);
    window.setTimeout(() => setShake(false), 480);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Completa usuario y contraseña para continuar.");
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      const user = await login(username.trim(), password);
      setSession(user);
    } catch (err) {
      setError(
        err.code === "network_error"
          ? "No se pudo conectar con el servidor. Verifica que la API esté corriendo."
          : "Usuario o contraseña incorrectos. Verifica tus datos e intenta de nuevo."
      );
      setPassword("");
      triggerShake();
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    authLogout();
    setSession(null);
    setUsername("");
    setPassword("");
    setError("");
  }

  return (
    <div
      className={`relative w-full max-w-sm rounded-2xl p-8 bg-card border border-primary/[0.16] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7),0_0_0_1px_rgba(0,0,0,0.3)] animate-bf-rise ${
        shake ? "animate-bf-shake" : ""
      }`}
    >
      {session ? (
        <SessionPanel session={session} onLogout={handleLogout} />
      ) : (
        <>
          {/* Marca */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-primary shadow-[0_6px_18px_-6px_#D4AF37]">
              <Scissors size={22} className="text-neutral" strokeWidth={2.25} />
            </div>
            <h1 className="font-display text-2xl text-[#F2EDE3] mb-1.5">
              BarberFlow
            </h1>
            <div className="w-16 h-px mb-2.5 bf-shimmer-line animate-bf-shimmer" />
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-secondary">
              Panel de acceso · Staff
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <FieldLabel>Usuario</FieldLabel>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C9488]"
                />
                <input
                  ref={usernameRef}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  className="bf-input w-full rounded-lg py-2.5 pl-10 pr-3 text-sm text-[#F2EDE3] bg-inputbg border border-tertiary transition-shadow"
                />
              </div>
            </div>

            <div className="mb-5">
              <FieldLabel>Contraseña</FieldLabel>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C9488]"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  className={`bf-input w-full rounded-lg py-2.5 pl-10 pr-10 text-sm text-[#F2EDE3] bg-inputbg border transition-shadow ${
                    error ? "border-danger" : "border-tertiary"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={16} className="text-[#9C9488]" />
                  ) : (
                    <Eye size={16} className="text-[#9C9488]" />
                  )}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none mb-5">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-3.5 h-3.5 accent-primary"
              />
              <span className="text-xs text-[#9C9488]">Recordarme</span>
            </label>

            {error && (
              <div
                className="flex items-start gap-2.5 rounded-lg px-3 py-2.5 mb-5 bg-danger-soft border border-danger/40 animate-bf-drop"
                role="alert"
              >
                <AlertCircle
                  size={16}
                  className="mt-0.5 shrink-0 text-danger"
                />
                <p className="text-[13px] leading-snug text-[#F0B4AE]">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-2.5 flex items-center justify-center gap-2 text-sm font-semibold text-neutral bg-primary transition-transform active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Verificando…
                </>
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function SessionPanel({ session, onLogout }) {
  return (
    <div className="flex flex-col items-center text-center py-4 animate-bf-drop">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-primary">
        <ShieldCheck size={22} className="text-neutral" strokeWidth={2.25} />
      </div>
      <h2 className="font-display text-xl text-[#F2EDE3] mb-1">
        Bienvenido, {session.username}
      </h2>
      <p className="font-mono text-[11px] text-[#9C9488] mb-6">
        Sesión de administrador
      </p>
      <div className="w-full rounded-lg px-4 py-3 mb-6 text-left bg-inputbg border border-tertiary">
        <p className="text-xs leading-relaxed text-[#9C9488]">
          Autenticado contra la API de BarberFlow. Este token JWT ya se
          adjunta automáticamente a los próximos llamados con{" "}
          <code>apiFetch</code>.
        </p>
      </div>
      <button
        onClick={onLogout}
        className="flex items-center gap-2 text-sm rounded-lg px-4 py-2.5 w-full justify-center bg-transparent border border-primary/[0.35] text-primary"
      >
        <LogOut size={15} />
        Cerrar sesión
      </button>
    </div>
  );
}
