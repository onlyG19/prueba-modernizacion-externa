/** Estado de una dependencia de la API. */
export type DependencyStatus = 'up' | 'down';

/** Respuesta de `GET /health`. */
export class HealthStatusDto {
  /**
   * `ok`: todo disponible. `degraded`: sin Redis (la API funciona, pero sin
   * contador de visitas). `error`: sin base de datos (la API no puede operar).
   * @example 'ok'
   */
  // [ANTES] status: 'ok' | 'degraded' | 'error';
  status!: 'ok' | 'degraded' | 'error';

  /**
   * Postgres.
   * @example 'up'
   */
  // [ANTES] database: DependencyStatus;
  database!: DependencyStatus;

  /**
   * Redis.
   * @example 'up'
   */
  // [ANTES] redis: DependencyStatus;
  redis!: DependencyStatus;
}
