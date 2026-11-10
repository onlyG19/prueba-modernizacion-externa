import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { solicitar, solicitarJson } from '../api/cliente';
import type { CambiosUsuario, NuevoUsuario, Usuario } from '../api/tipos';
import { useSesionActiva } from '../sesion/sesion-contexto';

const CLAVE_USUARIOS = ['usuarios'] as const;

/** Lista de usuarios (cacheada y deduplicada por TanStack Query). */
export function useUsuarios() {
  const { token } = useSesionActiva();
  return useQuery({
    queryKey: CLAVE_USUARIOS,
    queryFn: ({ signal }) =>
      solicitarJson<Usuario[]>('/usuarios', { token, signal }),
  });
}

/*
 * Las mutaciones actualizan la caché con la respuesta del servidor en vez de
 * volver a pedir toda la lista: un viaje de red menos por operación.
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
    onSuccess: (creado) => {
      cliente.setQueryData<Usuario[]>(CLAVE_USUARIOS, (actuales = []) => [
        ...actuales,
        creado,
      ]);
    },
  });
}

export function useActualizarUsuario() {
  const { token } = useSesionActiva();
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cambios }: { id: number; cambios: CambiosUsuario }) =>
      solicitarJson<Usuario>(`/usuarios/${id}`, {
        metodo: 'PATCH',
        cuerpo: cambios,
        token,
      }),
    onSuccess: (actualizado) => {
      cliente.setQueryData<Usuario[]>(CLAVE_USUARIOS, (actuales = []) =>
        actuales.map((u) => (u.id === actualizado.id ? actualizado : u)),
      );
    },
  });
}

export function useEliminarUsuario() {
  const { token } = useSesionActiva();
  const cliente = useQueryClient();
  return useMutation({
    // 204 sin cuerpo: no se interpreta como JSON.
    mutationFn: async (id: number) => {
      await solicitar(`/usuarios/${id}`, { metodo: 'DELETE', token });
    },
    onSuccess: (_respuesta, id) => {
      cliente.setQueryData<Usuario[]>(CLAVE_USUARIOS, (actuales = []) =>
        actuales.filter((u) => u.id !== id),
      );
    },
  });
}
