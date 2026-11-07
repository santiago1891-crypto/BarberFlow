

const KEY = "barberflow_cierre_caja";

function fechaDeHoy() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function getCierreDeHoy() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const cierre = JSON.parse(raw);
    if (!cierre || typeof cierre !== "object" || cierre.fecha !== fechaDeHoy()) return null;
    return cierre;
  } catch {
    return null;
  }
}

export function guardarCierre(resumen) {
  const cierre = {
    fecha: fechaDeHoy(),
    cerrado_en: new Date().toISOString(),
    cantidad_servicios: Number(resumen?.cantidad_servicios ?? 0),
    total_facturado: Number(resumen?.total_facturado ?? 0),
    total_comisiones_pagadas: Number(resumen?.total_comisiones_pagadas ?? 0),
    ganancia_barberia: Number(resumen?.ganancia_barberia ?? 0),
  };
  localStorage.setItem(KEY, JSON.stringify(cierre));
  return cierre;
}

export function limpiarCierre() {
  try {
    localStorage.removeItem(KEY);
  } catch {
  }
}
