// Funciones tipadas por recurso, todas contra los endpoints reales del
// backend de BarberFlow (barberia-crud). Cada una usa `request()` de
// ./api.js, que ya adjunta el JWT y homogeneiza los errores.

import { request, qs } from "./api.js";

const json = (body) => JSON.stringify(body);

export const barberosApi = {
  list: (params = {}) => request(`/barberos/${qs(params)}`),
  get: (id) => request(`/barberos/${id}`),
  create: (body) => request(`/barberos/`, { method: "POST", body: json(body) }),
  update: (id, body) => request(`/barberos/${id}`, { method: "PATCH", body: json(body) }),
  remove: (id) => request(`/barberos/${id}`, { method: "DELETE" }),
};

export const tiposServicioApi = {
  list: (params = {}) => request(`/tipos-servicio/${qs(params)}`),
  get: (id) => request(`/tipos-servicio/${id}`),
  create: (body) => request(`/tipos-servicio/`, { method: "POST", body: json(body) }),
  update: (id, body) => request(`/tipos-servicio/${id}`, { method: "PATCH", body: json(body) }),
  remove: (id) => request(`/tipos-servicio/${id}`, { method: "DELETE" }),
};

export const turnosApi = {
  list: (params = {}) => request(`/turnos/${qs(params)}`),
  get: (id) => request(`/turnos/${id}`),
  create: (body) => request(`/turnos/`, { method: "POST", body: json(body) }),
  update: (id, body) => request(`/turnos/${id}`, { method: "PATCH", body: json(body) }),
  remove: (id) => request(`/turnos/${id}`, { method: "DELETE" }),
  completar: (id, body = {}) => request(`/turnos/${id}/completar`, { method: "POST", body: json(body) }),
};

export const serviciosRealizadosApi = {
  list: (params = {}) => request(`/servicios-realizados/${qs(params)}`),
  get: (id) => request(`/servicios-realizados/${id}`),
  create: (body) => request(`/servicios-realizados/`, { method: "POST", body: json(body) }),
  update: (id, body) => request(`/servicios-realizados/${id}`, { method: "PATCH", body: json(body) }),
  remove: (id) => request(`/servicios-realizados/${id}`, { method: "DELETE" }),
};

export const pagosApi = {
  list: (params = {}) => request(`/pagos/${qs(params)}`),
  get: (id) => request(`/pagos/${id}`),
  create: (body) => request(`/pagos/`, { method: "POST", body: json(body) }),
  update: (id, body) => request(`/pagos/${id}`, { method: "PATCH", body: json(body) }),
  remove: (id) => request(`/pagos/${id}`, { method: "DELETE" }),
};

export const reportesApi = {
  agendaHoy: () => request(`/reportes/agenda-hoy`),
  comisionesMesActual: () => request(`/reportes/comisiones-mes-actual`),
  gananciasBarberosHoy: () => request(`/reportes/ganancias-barberos-hoy`),
  gananciaBarberiaHoy: () => request(`/reportes/ganancia-barberia-hoy`),
};
