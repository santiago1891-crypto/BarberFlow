// Cliente HTTP central de BarberFlow.
//
// - Resuelve la URL base desde VITE_API_URL (definida en .env).
// - Guarda el JWT en memoria + localStorage para persistir la sesión al
//   refrescar la página.
// - Expone `apiFetch`, que ya adjunta el header Authorization, para usarlo
//   más adelante con el resto de los endpoints del backend (barberos,
//   turnos, servicios, pagos, reportes).

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TOKEN_KEY = "barberflow_token";

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
 * Si el backend responde 401, limpia el token (la sesión expiró/es inválida).
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
  }

  return res;
}
