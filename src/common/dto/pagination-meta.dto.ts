/** Metadatos de una respuesta paginada. */
export class PaginationMetaDto {
  /**
   * Página devuelta.
   * @example 1
   */
  // [ANTES] page: number;
  page!: number;

  /**
   * Elementos por página.
   * @example 20
   */
  // [ANTES] limit: number;
  limit!: number;

  /**
   * Total de elementos que cumplen el filtro (en todas las páginas).
   * @example 42
   */
  // [ANTES] total: number;
  total!: number;

  /**
   * Total de páginas (0 si no hay elementos).
   * @example 3
   */
  // [ANTES] totalPages: number;
  totalPages!: number;
}
