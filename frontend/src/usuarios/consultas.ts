// [ANTES] import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
// [ANTES] import { solicitar, solicitarJson } from '../api/cliente';
import { ApiError, solicitar, solicitarJson } from '../api/cliente';
// [ANTES] import type { CambiosUsuario, NuevoUsuario, Usuario } from '../api/tipos';
import type {
  CambiosUsuario,
  NuevoUsuario,
  OrdenUsuarios,
  PaginaUsuarios,
  Usuario,
} from '../api/tipos';
import { useSesionActiva } from '../sesion/sesion-contexto';

const CLAVE_USUARIOS = ['usuarios'] as const;
const claveDetalle = (id: Usuario['id']) =>
  [...CLAVE_USUARIOS, 'detalle', id] as const;

export const USUARIOS_POR_PAGINA = 20;

export interface FiltroUsuarios {
  pagina: number;
  /** Texto a buscar en el servidor (nombre sin tildes o RUT). */
  busqueda: string;
  orden: OrdenUsuarios;
}

// [ANTES] /** Lista de usuarios (cacheada y deduplicada por TanStack Query). */
// [ANTES] export function useUsuarios() {
// [ANTES]   const { token } = useSesionActiva();
// [ANTES]   return useQuery({
// [ANTES]     queryKey: CLAVE_USUARIOS,
// [ANTES]     queryFn: ({ signal }) =>
// [ANTES]       solicitarJson<Usuario[]>('/usuarios', { token, signal }),
// [ANTES]   });
// [ANTES] }
/** Una página de usuarios, filtrada y ordenada por el servidor. */
// [ANTES] export function useUsuarios({ pagina, busqueda }: FiltroUsuarios) {
export function useUsuarios({ pagina, busqueda, orden }: FiltroUsuarios) {
  const { token } = useSesionActiva();
  return useQuery({
    // [ANTES] queryKey: [...CLAVE_USUARIOS, { pagina, busqueda }],
    queryKey: [...CLAVE_USUARIOS, { pagina, busqueda, orden }],
    queryFn: async ({ signal }) => {
      const parametros = new URLSearchParams({
        page: String(pagina),
        limit: String(USUARIOS_POR_PAGINA),
        orden,
      });
      if (busqueda) {
        parametros.set('buscar', busqueda);
      }
      const respuesta = await solicitarJson<PaginaUsuarios>(
        `/usuarios?${parametros}`,
        { token, signal },
      );
      // Cada página recuerda qué búsqueda la produjo: mientras llega la
      // siguiente, la interfaz describe lo que de verdad se ve.
      return { ...respuesta, busqueda };
    },
    // Mientras llega la página nueva se sigue viendo la anterior: sin parpadeo.
    placeholderData: keepPreviousData,
  });
}

/**
 * Un usuario por su id, para el detalle. Mientras llega se muestran los datos
 * de la fila (`placeholderData`): el detalle se abre al instante y se
 * completa con la versión vigente del servidor.
 *
 * @remarks La clave cuelga de `['usuarios']`: las mutaciones, que invalidan
 * esa clave, también refrescan el detalle abierto.
 */
export function useUsuario(deLaFila: Usuario) {
  const { token } = useSesionActiva();
  return useQuery({
    queryKey: claveDetalle(deLaFila.id),
    queryFn: ({ signal }) =>
      solicitarJson<Usuario>(`/usuarios/${deLaFila.id}`, { token, signal }),
    placeholderData: deLaFila,
  });
}

// [ANTES] /*
// [ANTES]  * Las mutaciones actualizan la caché con la respuesta del servidor en vez de
// [ANTES]  * volver a pedir toda la lista: un viaje de red menos por operación.
// [ANTES]  */
/*
 * Con paginación, tras cada mutación se invalida la lista y se vuelve a pedir
 * la página: un usuario nuevo puede quedar en otra página según el orden.
 */

export function useCrearUsuario() {
  const { token } = useSesionActiva();
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (datos: NuevoUsuario) =>
      solicitarJson<Usuario>('/usuarios', {
        metodo: 'POST',
        cuerpo: datos,
        token,
      }),
    // [ANTES] onSuccess: (creado) => {
    // [ANTES]   cliente.setQueryData<Usuario[]>(CLAVE_USUARIOS, (actuales = []) => [
    // [ANTES]     ...actuales,
    // [ANTES]     creado,
    // [ANTES]   ]);
    // [ANTES] },
    onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_USUARIOS }),
  });
}

export function useActualizarUsuario() {
  const { token } = useSesionActiva();
  const cliente = useQueryClient();
  return useMutation({
    // [ANTES] mutationFn: ({ id, cambios }: { id: number; cambios: CambiosUsuario }) =>
    mutationFn: ({
      id,
      version,
      cambios,
    }: {
      id: Usuario['id'];
      /** Versión sobre la que se editó: si ya cambió, la API responde 412. */
      version: Usuario['version'];
      cambios: CambiosUsuario;
    }) =>
      solicitarJson<Usuario>(`/usuarios/${id}`, {
        metodo: 'PATCH',
        cuerpo: cambios,
        token,
        cabeceras: { 'If-Match': `"${version}"` },
      }),
    // [ANTES] onSuccess: (actualizado) => {
    // [ANTES]   cliente.setQueryData<Usuario[]>(CLAVE_USUARIOS, (actuales = []) =>
    // [ANTES]     actuales.map((u) => (u.id === actualizado.id ? actualizado : u)),
    // [ANTES]   );
    // [ANTES] },
    // [ANTES] onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_USUARIOS }),
    onSuccess: (actualizado) => {
      // El detalle abierto muestra al instante lo que respondió el servidor,
      // sin pasar un momento por los datos de antes.
      cliente.setQueryData(claveDetalle(actualizado.id), actualizado);
      return cliente.invalidateQueries({ queryKey: CLAVE_USUARIOS });
    },
    // 412: otra persona lo cambió. Se recarga la lista para mostrar su versión.
    onError: (error) => {
      if (error instanceof ApiError && error.status === 412) {
        void cliente.invalidateQueries({ queryKey: CLAVE_USUARIOS });
      }
    },
  });
}

export function useEliminarUsuario() {
  const { token } = useSesionActiva();
  const cliente = useQueryClient();
  return useMutation({
    // 204 sin cuerpo: no se interpreta como JSON.
    // [ANTES] mutationFn: async (id: number) => {
    mutationFn: async (id: Usuario['id']) => {
      await solicitar(`/usuarios/${id}`, { metodo: 'DELETE', token });
    },
    // [ANTES] onSuccess: (_respuesta, id) => {
    // [ANTES]   cliente.setQueryData<Usuario[]>(CLAVE_USUARIOS, (actuales = []) =>
    // [ANTES]     actuales.filter((u) => u.id !== id),
    // [ANTES]   );
    // [ANTES] },
    onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_USUARIOS }),
  });
}
