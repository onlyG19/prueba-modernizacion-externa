import type { Usuario } from '../api/tipos';

/** Id del botón "Editar" de una fila, para devolverle el foco al terminar. */
// [ANTES] export const idBotonEditar = (id: number) => `editar-usuario-${id}`;
export const idBotonEditar = (id: Usuario['id']) => `editar-usuario-${id}`;
