/**
 * Qué puede hacer una sesión. `admin` es el usuario del `.env` y además crea
 * cuentas; `operador` es quien ingresa con una de esas cuentas y gestiona los
 * usuarios.
 */
export const ROLES = ['admin', 'operador'] as const;

export type Rol = (typeof ROLES)[number];
