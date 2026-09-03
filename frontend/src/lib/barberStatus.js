// Deriva el estado "en vivo" de cada barbero cruzando /barberos con
// /reportes/agenda-hoy (la agenda no trae barbero_id, solo el nombre, así
// que matcheamos por nombre completo).

export function fullName(b) {
  return `${b.nombre} ${b.apellido}`.trim();
}

const STATUS_META = {
  en_turno: { label: "En turno", variant: "success", pulse: true },
  disponible: { label: "Disponible hoy", variant: "primary", pulse: false },
  inactivo: { label: "Inactivo", variant: "danger", pulse: false },
  sin_turnos: { label: "Sin turnos hoy", variant: "neutral", pulse: false },
};

export function computeBarberStatuses(barberos = [], agendaHoy = []) {
  const map = new Map();

  const agendaByName = new Map();
  for (const item of agendaHoy) {
    const key = item.barbero;
    if (!agendaByName.has(key)) agendaByName.set(key, []);
    agendaByName.get(key).push(item);
  }

  for (const b of barberos) {
    const items = agendaByName.get(fullName(b)) || [];
    let statusKey;

    if (items.some((i) => i.estado === "en_curso")) {
      statusKey = "en_turno";
    } else if (!b.activo) {
      statusKey = "inactivo";
    } else if (items.some((i) => ["pendiente", "confirmado"].includes(i.estado))) {
      statusKey = "disponible";
    } else {
      statusKey = "sin_turnos";
    }

    map.set(b.id, { ...STATUS_META[statusKey], key: statusKey, turnosHoy: items.length });
  }

  return map;
}

export { STATUS_META };
