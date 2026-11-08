

import { API_URL, setToken, getToken, onUnauthorized } from "./api.js";

export { onUnauthorized };

/**
 * Inicia sesión contra POST /auth/login.
 * Lanza un Error con `code` "invalid_credentials" o "network_error" para
 * que la UI pueda mostrar un mensaje apropiado en cada caso.
 *
 * @param remember false = el token solo vive en la pestaña actual
 *                 (checkbox "Recordarme" sin marcar).
 */
export async function login(username, password, { remember = true } = {}) {
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
    // 401/400 = credenciales rechazadas por el backend. Cualquier otro
    // status (500, 404 por VITE_API_URL mal configurada, etc.) NO es un
    // problema de la contraseña: tratarlo como tal hacía que el usuario
    // la cambiara creyéndose equivocado.
    if (res.status === 401 || res.status === 400) {
      const err = new Error("Usuario o contraseña incorrectos.");
      err.code = "invalid_credentials";
      throw err;
    }
    let detail = "";
    try {
      const data = await res.json();
      if (typeof data.detail === "string") detail = data.detail;
    } catch {
      // Sin cuerpo JSON (por ejemplo un 500 en texto plano)
    }
    const err = new Error(detail || `No se pudo iniciar sesión (error ${res.status}).`);
    err.code = "server_error";
    err.status = res.status;
    throw err;
  }

  const data = await res.json(); // { access_token, token_type }
  setToken(data.access_token, remember);

  return { username };
}

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
