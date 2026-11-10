import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/cliente';

/** En tests no se reintenta: un error debe verse de inmediato. */
const REINTENTOS = import.meta.env.MODE === 'test' ? 0 : 2;

/**
 * Cliente de TanStack Query de la consola.
 *
 * @param alExpirarSesion - Se llama ante cualquier 401: el token venció o fue
 *   revocado, así que se vuelve al login en vez de mostrar errores sueltos.
 */
export function crearClienteConsultas(alExpirarSesion: () => void) {
  const siNoAutorizado = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      alExpirarSesion();
    }
  };

  return new QueryClient({
    queryCache: new QueryCache({ onError: siNoAutorizado }),
    mutationCache: new MutationCache({ onError: siNoAutorizado }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Un 4xx no se arregla reintentando; un 5xx o una caída de red, quizá.
        retry: (fallas, error) =>
          fallas < REINTENTOS &&
          !(error instanceof ApiError && error.status < 500),
      },
    },
  });
}
