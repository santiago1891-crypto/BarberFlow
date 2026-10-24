import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // host: true (0.0.0.0) es necesario para que el server sea alcanzable
    // desde fuera del contenedor cuando corre en Docker; no molesta en
    // local tampoco.
    host: true,
    watch: {
      // Algunos entornos (Docker en Mac/Windows, ciertos filesystems de
      // red) no emiten eventos de filesystem nativos dentro del volumen
      // montado; usePolling evita que el hot-reload se quede "colgado".
      usePolling: process.env.CHOKIDAR_USEPOLLING === "true",
    },
  },
});
