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

export function formatTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(value) {
  if (!value) return "—";
  return `${formatDate(value)} ${formatTime(value)}`;
}

/** ISO string -> valor para <input type="datetime-local"> (hora local). */
export function toDatetimeLocalValue(value) {
  const d = value ? new Date(value) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
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

/** Valor de <input type="datetime-local"> -> ISO string para mandar a la API. */
export function fromDatetimeLocalValue(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

/** Inicio y fin (ISO) del día de hoy, en horario local. */
export function todayRangeISO() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { desde: start.toISOString(), hasta: end.toISOString() };
}

export function initials(nombre = "", apellido = "") {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase() || "?";
}

export const METODO_PAGO_LABEL = {
  efectivo: "Efectivo",
  tarjeta_debito: "Tarjeta de débito",
  tarjeta_credito: "Tarjeta de crédito",
  transferencia: "Transferencia",
  mercado_pago: "Mercado Pago",
};

/** true si la fecha (ISO) cae dentro del día de hoy, en horario local. */
export function isToday(value) {
  if (!value) return false;
  const d = new Date(value);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
