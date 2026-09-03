// Cliente HTTP central de BarberFlow.
//
// - Resuelve la URL base desde VITE_API_URL (definida en .env).
// - Guarda el JWT en memoria + localStorage para persistir la sesión al
//   refrescar la página.
// - Expone `apiFetch`, que ya adjunta el header Authorization.
// - Si el backend responde 401 (token vencido/ inválido), limpia la sesión
//   y avisa a quien esté suscripto (App.jsx) para volver al login.

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TOKEN_KEY = "barberflow_token";
let unauthorizedHandler = null;

export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Wrapper de fetch que apunta a la API y adjunta el JWT guardado.
 */
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
    unauthorizedHandler?.();
  }

  return res;
}

/** Convierte un objeto de params en query string, saltando undefined/null/"". */
export function qs(params = {}) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    usp.set(key, value);
  });
  const str = usp.toString();
  return str ? `?${str}` : "";
}

/**
 * fetch + parseo de JSON + manejo de errores homogéneo.
 * Lanza un Error con el detalle que devuelve FastAPI (`detail`) cuando la
 * respuesta no es 2xx, para que la UI pueda mostrarlo directo.
 */
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
