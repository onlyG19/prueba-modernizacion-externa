const COMODINES_LIKE = /[\\%_]/g;

/**
 * Escapa los comodines de LIKE/ILIKE (`%`, `_` y la barra invertida) para que
 * el texto del usuario se busque literal: buscar "%" no debe devolver todo.
 *
 * @remarks No reemplaza a los parámetros de la consulta (que evitan la
 * inyección SQL): se aplica además, al valor que se pasa como parámetro.
 */
export function escaparLike(texto: string): string {
  return texto.replace(COMODINES_LIKE, (comodin) => `\\${comodin}`);
}
