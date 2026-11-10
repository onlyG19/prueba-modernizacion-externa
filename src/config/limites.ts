/**
 * Límites de peticiones por IP (rate limiting, con @nestjs/throttler).
 *
 * @remarks
 * Se guardan en memoria: valen por instancia de la API. Con varias instancias
 * habría que compartir el conteo en Redis (p. ej. con un storage de Redis
 * para el throttler).
 */
const UN_MINUTO = 60_000;

/** Toda la API: holgado para el uso normal, corta un abuso automatizado. */
export const LIMITE_GENERAL = { ttl: UN_MINUTO, limit: 100 };

/** Login: frena los intentos de adivinar contraseñas (fuerza bruta). */
export const LIMITE_LOGIN = { ttl: UN_MINUTO, limit: 10 };

/** Logo: cada petición suma una visita; evita inflar el contador. */
export const LIMITE_LOGO = { ttl: UN_MINUTO, limit: 30 };

export const MENSAJE_LIMITE =
  'Demasiadas solicitudes seguidas. Espera un momento e inténtalo de nuevo.';
