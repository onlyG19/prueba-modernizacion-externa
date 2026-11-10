/**
 * Configuración exclusiva de los tests e2e: corren contra contenedores
 * desechables, así que estos valores nunca protegen datos reales.
 */

/** Administrador de los e2e. */
export const ADMIN_E2E = { username: 'admin', password: 'e2e-clave-de-prueba' };

/**
 * Hash scrypt de `ADMIN_E2E.password`, generado con `pnpm auth:hash-password`.
 * Es el mismo que usan los e2e del frontend (frontend/playwright.config.ts).
 */
const HASH_ADMIN_E2E =
  'b49a2847ac3a822856507fa613903f70:cf0cfac32642cc948d271dce13f91b6650a742647f6c695e88c20178e7861ffe6487c9d8e2589a7dd25d71a02471d1612a8291c2b27f314cc5ec6a7175ea099f';

/** Origen permitido por CORS en los e2e. */
export const ORIGEN_E2E = 'http://localhost:5173';

/**
 * Variables de entorno de la API en los e2e, salvo las de Postgres y Redis,
 * que dependen de los puertos que asigne Docker a los contenedores.
 */
export const ENTORNO_E2E = {
  NODE_ENV: 'test',
  JWT_SECRET: 'secreto-exclusivo-de-los-tests-e2e-0123456789',
  AUTH_USER: ADMIN_E2E.username,
  AUTH_PASSWORD_HASH: HASH_ADMIN_E2E,
  CORS_ORIGIN: ORIGEN_E2E,
  TRUST_PROXY: '0',
};
