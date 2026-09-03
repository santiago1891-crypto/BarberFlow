// Capa de autenticación de BarberFlow, conectada al backend FastAPI
// (barberia-crud). El login del admin usa el flujo estándar de OAuth2
// Password Flow: form-urlencoded con "username" y "password", que devuelve
// un JWT.

import { API_URL, setToken, getToken, onUnauthorized } from "./api.js";

export { onUnauthorized };

/**
 * Inicia sesión contra POST /auth/login.
 * Lanza un Error con `code` "invalid_credentials" o "network_error" para
 * que la UI pueda mostrar un mensaje apropiado en cada caso.
 */
export async function login(username, password) {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);

  let res;
  try {
    res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    const err = new Error("No se pudo conectar con el servidor.");
    err.code = "network_error";
    throw err;
  }

  if (!res.ok) {
    const err = new Error("Usuario o contraseña incorrectos.");
    err.code = "invalid_credentials";
    throw err;
  }

  const data = await res.json(); // { access_token, token_type }
  setToken(data.access_token);

  return { username };
}

/** Restaura la sesión desde el token guardado (por ejemplo, al recargar). */
export function getStoredSession() {
  const token = getToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      setToken(null);
      return null;
    }
    return { username: payload.sub };
  } catch {
    setToken(null);
    return null;
  }
}

export function logout() {
  setToken(null);
}
