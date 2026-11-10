import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { solicitarJson } from '../api/cliente';
import type {
  Cuenta,
  NuevaCuenta,
  OrdenCuentas,
  PaginaCuentas,
} from '../api/tipos';
import { useSesionActiva } from '../sesion/sesion-contexto';

const CLAVE_CUENTAS = ['cuentas'] as const;

export const CUENTAS_POR_PAGINA = 20;

export interface FiltroCuentas {
  pagina: number;
  /** Parte del usuario a buscar en el servidor. */
  busqueda: string;
  orden: OrdenCuentas;
}

/** Una página de cuentas, filtrada y ordenada por el servidor (solo el admin). */
export function useCuentas({ pagina, busqueda, orden }: FiltroCuentas) {
  const { token } = useSesionActiva();
  return useQuery({
    queryKey: [...CLAVE_CUENTAS, { pagina, busqueda, orden }],
    queryFn: async ({ signal }) => {
      const parametros = new URLSearchParams({
        page: String(pagina),
        limit: String(CUENTAS_POR_PAGINA),
        orden,
      });
      if (busqueda) {
        parametros.set('buscar', busqueda);
      }
      const respuesta = await solicitarJson<PaginaCuentas>(
        `/cuentas?${parametros}`,
        { token, signal },
      );
      // Como en usuarios: cada página recuerda qué búsqueda la produjo.
      return { ...respuesta, busqueda };
    },
    // Mientras llega la página nueva se sigue viendo la anterior: sin parpadeo.
    placeholderData: keepPreviousData,
  });
}

/**
 * Crea una cuenta. Solo el admin puede: a otro rol la API le responde 403.
 * Tras crearla se invalida la lista, que puede ordenarla en otra página.
 */
export function useCrearCuenta() {
  const { token } = useSesionActiva();
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (datos: NuevaCuenta) =>
      solicitarJson<Cuenta>('/cuentas', {
        metodo: 'POST',
        cuerpo: datos,
        token,
      }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_CUENTAS }),
  });
}
