/** Metadatos de una respuesta paginada. */
export class PaginationMetaDto {
  /**
   * Página devuelta.
   * @example 1
   */
  page!: number;

  /**
   * Elementos por página.
   * @example 20
   */
  limit!: number;

  /**
   * Total de elementos que cumplen el filtro (en todas las páginas).
   * @example 42
   */
  total!: number;

  /**
   * Total de páginas (0 si no hay elementos).
   * @example 3
   */
  totalPages!: number;
}
