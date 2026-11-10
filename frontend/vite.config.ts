import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Dominio compartido con el backend (value object `Rut`). Vive fuera de
 * `frontend/`, así que la regla del RUT se escribe una sola vez y la usan
 * ambos lados.
 */
const DOMINIO = fileURLToPath(
  new URL('../src/modules/usuarios/domain', import.meta.url),
);

/**
 * Backend al que se redirigen las llamadas a `/api` en desarrollo. La API ya
 * sirve sus rutas bajo `/api/v1`: se reenvían tal cual, sin reescribirlas.
 */
const API_DESTINO = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';

const proxyApi = {
  '/api': {
    target: API_DESTINO,
    changeOrigin: true,
    // [ANTES] rewrite: (ruta: string) => ruta.replace(/^\/api/, ''),
  },
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@dominio': DOMINIO },
  },
  server: {
    port: 5173,
    // Vite solo sirve archivos dentro del proyecto: se autoriza el dominio.
    fs: { allow: ['.', DOMINIO] },
    // Mismo origen para el navegador: sin CORS en desarrollo.
    proxy: proxyApi,
  },
  preview: {
    port: 4173,
    proxy: proxyApi,
  },
  test: {
    environment: 'jsdom',
    // e2e/ es de Playwright: Vitest solo corre los tests de src/.
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
});
