/** ETag fuerte de una versión del recurso: `"3"`. */
export function etagDeVersion(version: number): string {
  return `"${version}"`;
}

/** Una etiqueta fuerte de versión: `"3"` (con espacios alrededor, por la lista). */
const ETAG_DE_VERSION = /^\s*"(\d+)"\s*$/;

/**
 * Versiones aceptadas según la cabecera `If-Match` (RFC 9110):
 *
 * - sin cabecera, o `*`: `undefined`, no se exige ninguna versión;
 * - `"3"` o una lista `"2", "3"`: esas versiones;
 * - etiquetas débiles (`W/"3"`) o que no son versiones: no coinciden con
 *   nada, porque `If-Match` exige comparación fuerte. Resultado: lista vacía,
 *   que termina en `412 Precondition Failed`.
 */
export function versionesDeIfMatch(
  ifMatch: string | undefined,
): number[] | undefined {
  if (ifMatch === undefined || ifMatch.trim() === '*') {
    return undefined;
  }
  return ifMatch
    .split(',')
    .map((etiqueta) => ETAG_DE_VERSION.exec(etiqueta)?.[1])
    .filter((version): version is string => version !== undefined)
    .map(Number);
}
