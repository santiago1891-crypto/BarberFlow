
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TOKEN_KEY = "barberflow_token";
let unauthorizedHandler = null;
// Al cargar el panel hay varios requests en paralelo y cada 401 disparaba
// el aviso: con la bandera se notifica una sola vez por sesión caída.
let aviso401Pendiente = false;

export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

export function getToken() {

  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

/**
 * Guarda (o limpia) el JWT.
 *
 * @param token   token a guardar, o null para cerrar sesión.
 * @param persist true = localStorage (persiste al recargar, "recordarme"),
 *                false = sessionStorage (se borra al cerrar la pestaña).
 */
export function setToken(token, persist = true) {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    return;
  }
  // Entró un token nuevo (login): el próximo 401 vuelve a notificarse.
  aviso401Pendiente = false;
  const destino = persist ? localStorage : sessionStorage;
  const otro = persist ? sessionStorage : localStorage;
  otro.removeItem(TOKEN_KEY);
  destino.setItem(TOKEN_KEY, token);
}


export async function apiFetch(path, options = {}) {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    setToken(null);
    if (!aviso401Pendiente) {
      aviso401Pendiente = true;
      unauthorizedHandler?.();
    }
  }

  return res;
}

export function qs(params = {}) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    usp.set(key, value);
  });
  const str = usp.toString();
  return str ? `?${str}` : "";
}


export async function request(path, options = {}) {
  let res;
  try {
    res = await apiFetch(path, options);
  } catch {
    const err = new Error("No se pudo conectar con el servidor.");
    err.code = "network_error";
    throw err;
  }

  if (res.status === 204) return null;

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    let message = `Error ${res.status}`;
    if (data && typeof data === "object" && data.detail) {
      message = Array.isArray(data.detail)
        ? data.detail.map((d) => d.msg).join(" · ")
        : String(data.detail);
    } else if (typeof data === "string" && data) {
      message = data;
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  return data;
}
