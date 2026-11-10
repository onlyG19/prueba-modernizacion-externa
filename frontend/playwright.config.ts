import { defineConfig, devices } from '@playwright/test';

const PUERTO_API = 3100;
const PUERTO_WEB = 5180;

/**
 * Credenciales SOLO para la base de datos e2e (aislada y vaciada en cada
 * corrida). Contraseña: "e2e-clave-de-prueba"; el hash se generó con
 * `pnpm auth:hash-password` en la raíz del proyecto.
 */
const HASH_ADMIN_E2E =
  'b49a2847ac3a822856507fa613903f70:cf0cfac32642cc948d271dce13f91b6650a742647f6c695e88c20178e7861ffe6487c9d8e2589a7dd25d71a02471d1612a8291c2b27f314cc5ec6a7175ea099f';

/**
 * Tests end-to-end: un navegador real contra el frontend (Vite), la API
 * NestJS, Postgres y Redis. Requiere Postgres y Redis en ejecución
 * (`docker compose up -d` en la raíz).
 */
export default defineConfig({
  testDir: './e2e',
  // Comparten una misma base de datos: se ejecutan en orden, de a uno.
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PUERTO_WEB}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node e2e/servidor-api.mjs',
      // /docs-json responde aunque Redis esté caído (/logo/count daría 503).
      url: `http://localhost:${PUERTO_API}/docs-json`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        PORT: String(PUERTO_API),
        NODE_ENV: 'test',
        JWT_SECRET: 'secreto-exclusivo-de-los-tests-e2e-0123456789',
        AUTH_USER: 'admin',
        AUTH_PASSWORD_HASH: HASH_ADMIN_E2E,
        CORS_ORIGIN: `http://localhost:${PUERTO_WEB}`,
      },
    },
    {
      command: `pnpm exec vite --port ${PUERTO_WEB} --strictPort`,
      url: `http://localhost:${PUERTO_WEB}`,
      reuseExistingServer: false,
      env: { API_PROXY_TARGET: `http://localhost:${PUERTO_API}` },
    },
  ],
});
