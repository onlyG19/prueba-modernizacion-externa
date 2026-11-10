/*
 * Reglas de las credenciales de una cuenta. Las comparten el backend (DTO y
 * entidad) y el frontend (alias `@dominio-cuentas`): el formulario avisa lo
 * mismo que respondería la API, sin escribir las reglas dos veces.
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

/** Letras sin tildes, números, punto, guion y guion bajo (ya en minúsculas). */
export const USERNAME_PATTERN = /^[a-z0-9._-]+$/;

/**
 * Mínimo de la contraseña. Se pide largo y no "una mayúscula, un número y un
 * símbolo": el largo es lo que más la protege (NIST SP 800-63B).
 */
export const PASSWORD_MIN_LENGTH = 12;

/** Tope de la contraseña: evita que hashear un texto enorme cueste demasiado. */
export const PASSWORD_MAX_LENGTH = 128;

/**
 * El usuario como se guarda y se busca: sin espacios en los extremos y en
 * minúsculas. Así `Maria.Lopez` y `maria.lopez` son la misma cuenta.
 */
export function normalizarUsername(username: string): string {
  return username.trim().toLowerCase();
}
