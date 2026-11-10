/** Estado de una dependencia de la API. */
export type DependencyStatus = 'up' | 'down';

/** Respuesta de `GET /health`. */
export class HealthStatusDto {
  /**
   * `ok`: todo disponible. `degraded`: sin Redis (la API funciona, pero sin
   * contador de visitas). `error`: sin base de datos (la API no puede operar).
   * @example 'ok'
   */
  status!: 'ok' | 'degraded' | 'error';

  /**
   * Postgres.
   * @example 'up'
   */
  database!: DependencyStatus;

  /**
   * Redis.
   * @example 'up'
   */
  redis!: DependencyStatus;
}
