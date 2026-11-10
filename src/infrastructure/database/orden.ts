/**
 * Traduce un orden de la API (`campo`, o `-campo` para descendente) a la
 * columna y la dirección del `ORDER BY`.
 *
 * @remarks La columna sale de una lista cerrada (`columnas`): lo que pide el
 * cliente solo se usa para buscar en ella y nunca llega tal cual al SQL.
 *
 * @example interpretarOrden('-creadoEn', { creadoEn: 'u.creadoEn' })
 * // → { columna: 'u.creadoEn', direccion: 'DESC' }
 */
export function interpretarOrden<Campo extends string>(
  orden: Campo | `-${Campo}`,
  columnas: Readonly<Record<Campo, string>>,
): { columna: string; direccion: 'ASC' | 'DESC' } {
  const descendente = orden.startsWith('-');
  const campo = (descendente ? orden.slice(1) : orden) as Campo;
  return {
    columna: columnas[campo],
    direccion: descendente ? 'DESC' : 'ASC',
  };
}
