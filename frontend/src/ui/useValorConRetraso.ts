import { useEffect, useState } from 'react';

/**
 * Devuelve `valor` recién cuando deja de cambiar durante `ms` milisegundos
 * (debounce). Sirve para no hacer una petición por cada tecla.
 */
export function useValorConRetraso<T>(valor: T, ms: number): T {
  const [retrasado, setRetrasado] = useState(valor);

  // Sincroniza con un temporizador (sistema externo): aquí sí va un efecto.
  useEffect(() => {
    const temporizador = window.setTimeout(() => setRetrasado(valor), ms);
    return () => window.clearTimeout(temporizador);
  }, [valor, ms]);

  return retrasado;
}
