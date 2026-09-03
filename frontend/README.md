# BarberFlow — Frontend

Panel de autenticación de BarberFlow, construido con **Vite + React + Tailwind CSS**,
usando el sistema de diseño de marca (dorado `#D4AF37`, cuero `#885A2B`, carbón
`#2C2C2C` / `#121212`, tipografías Libre Caslon Text · Hanken Grotesk · JetBrains Mono).

Ya está conectado al backend real de **barberia-crud** (FastAPI).

## Requisitos

- Node.js 18+
- El backend (`barberia-crud`) corriendo en paralelo — ver su propio README.

## Instalación

```bash
npm install
npm run dev
```

Esto levanta el servidor de desarrollo en `http://localhost:5173`.

## Estructura

```
src/
  components/
    AuthPanel.jsx   # Formulario de login (UI + validaciones)
  lib/
    api.js          # Cliente HTTP central: URL base, token, apiFetch()
    auth.js         # Login/logout contra el backend real (JWT)
  App.jsx           # Layout raíz
  main.jsx          # Punto de entrada
  index.css         # Tailwind + estilos base
tailwind.config.js  # Tokens de color y tipografía de la marca
```

## Conexión con el backend

El login llama a `POST {VITE_API_URL}/auth/login` con un formulario
`application/x-www-form-urlencoded` (`username` + `password`), como espera
el backend (OAuth2 Password Flow). No es correo — el backend tiene un único
usuario administrador definido por variables de entorno.

La URL del backend se configura en `.env`:

```
VITE_API_URL=http://localhost:8000
```

(ya viene con ese valor por defecto, que apunta al backend corriendo local
en el puerto estándar de `uvicorn`).

El JWT recibido se guarda en `localStorage` (`src/lib/api.js`) y la sesión se
restaura automáticamente al recargar la página. Para llamar al resto de los
endpoints protegidos (`/barberos`, `/turnos`, `/pagos`, etc.) una vez logueado,
usá el helper `apiFetch` de `src/lib/api.js`, que ya adjunta el header
`Authorization: Bearer <token>`:

```js
import { apiFetch } from "./lib/api.js";

const res = await apiFetch("/barberos/");
const barberos = await res.json();
```

## Build de producción

```bash
npm run build
npm run preview
```

