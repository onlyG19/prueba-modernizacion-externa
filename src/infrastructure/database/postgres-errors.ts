import { QueryFailedError } from 'typeorm';

/** Código SQLSTATE de Postgres para violación de restricción UNIQUE. */
export const PG_UNIQUE_VIOLATION = '23505';

/**
 * Indica si un error corresponde a una violación de restricción UNIQUE en Postgres.
 *
 * @param error - Error capturado al ejecutar una operación del orm de la app: TypeORM.
 * @returns `true` si Postgres rechazó la operación por un valor duplicado.
 */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === PG_UNIQUE_VIOLATION
  );
}
