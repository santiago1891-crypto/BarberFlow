// Helpers de formateo compartidos por todo el dashboard.

export function formatMoney(value) {
  const n = Number(value ?? 0);
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Fecha "YYYY-MM-DD" (columna `fecha`, sin hora) -> "dd/mm/aaaa".
 * No usar formatDate con esto: new Date("2026-11-07") se interpreta como
 * UTC y en Argentina (UTC-3) mostraba el día anterior.
 */
export function formatDateOnly(value) {
  if (!value) return "—";
  const [y, m, d] = String(value).split("-").map(Number);
  if (!y || !m || !d) return formatDate(value);
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(value) {
  if (!value) return "—";
  return `${formatDate(value)} ${formatTime(value)}`;
}

/** ISO string -> valor para <input type="date"> (hora local). */
export function toDateInputValue(value) {
  const d = value ? new Date(value) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO string -> valor para <input type="time"> (hora local). */
export function toTimeInputValue(value) {
  const d = value ? new Date(value) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Combina <input type="date"> + <input type="time"> en un ISO string para la API. */
export function combineDateAndTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}

export function initials(nombre = "", apellido = "") {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase() || "?";
}
