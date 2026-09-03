// Sistema de notificaciones (toasts) minimalista, basado en pub/sub.
// Cualquier componente puede llamar a toast.success(...) / toast.error(...)
// sin necesidad de pasar props ni envolver la app en un Provider.

let listeners = [];
let idCounter = 0;

function emit(toast) {
  const id = ++idCounter;
  const full = { id, ...toast };
  listeners.forEach((l) => l(full));
  return id;
}

export function subscribe(listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export const toast = {
  success: (message) => emit({ type: "success", message }),
  error: (message) => emit({ type: "error", message }),
  info: (message) => emit({ type: "info", message }),
};
