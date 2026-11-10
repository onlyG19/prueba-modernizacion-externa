/** Comodín que permite cualquier origen. Solo se acepta fuera de producción. */
export const ANY_ORIGIN = '*';

/**
 * Formato de un origen: esquema + host (+ puerto), sin ruta ni barra final.
 * Es exactamente lo que el navegador envía en el header `Origin`.
 */
const ORIGIN_FORMAT = /^https?:\/\/[^/\s]+$/;

/**
 * Convierte `CORS_ORIGIN` al formato que espera `app.enableCors()`.
 *
 * @param value - `"*"` o una lista de orígenes separados por comas.
 * @returns `"*"` si la lista incluye el comodín; si no, los orígenes.
 *
 * @example
 * ```ts
 * parseCorsOrigins('*');                                     // '*'
 * parseCorsOrigins('https://a.cl, https://b.cl');            // ['https://a.cl', 'https://b.cl']
 * ```
 */
export function parseCorsOrigins(value: string): typeof ANY_ORIGIN | string[] {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.includes(ANY_ORIGIN) ? ANY_ORIGIN : origins;
}

/**
 * Valida `CORS_ORIGIN` según el entorno.
 *
 * @param value - Valor crudo de `CORS_ORIGIN`.
 * @param isProduction - En producción no se permite el comodín `"*"`.
 * @returns Los mensajes de error encontrados (vacío si es válido).
 */
export function validateCorsOrigins(
  value: string,
  isProduction: boolean,
): string[] {
  const origins = parseCorsOrigins(value);

  if (origins === ANY_ORIGIN) {
    return isProduction
      ? [
          'CORS_ORIGIN no puede ser "*" en producción: define la lista de orígenes permitidos',
        ]
      : [];
  }
  if (origins.length === 0) {
    return ['CORS_ORIGIN debe tener al menos un origen'];
  }
  return origins
    .filter((origin) => !ORIGIN_FORMAT.test(origin))
    .map(
      (origin) =>
        `CORS_ORIGIN tiene un origen inválido: "${origin}" (formato esperado: https://dominio[:puerto], sin barra final)`,
    );
}
