import { useEffect, useState } from 'react';
import { useValorConRetraso } from './useValorConRetraso';

/** Parámetros de la URL: un enlace o una recarga conservan búsqueda y página. */
const PARAMETRO_BUSQUEDA = 'buscar';
const PARAMETRO_PAGINA = 'pagina';
const PARAMETRO_ORDEN = 'orden';

/** Pausa tras la última tecla antes de preguntarle al servidor. */
const RETRASO_BUSQUEDA_MS = 300;

const parametro = (nombre: string) =>
  new URLSearchParams(window.location.search).get(nombre);

/** La página de la URL; si falta o no es un entero positivo, la primera. */
function leerPagina(): number {
  const pagina = Number(parametro(PARAMETRO_PAGINA));
  return Number.isSafeInteger(pagina) && pagina > 0 ? pagina : 1;
}

/** El orden de la URL; si falta o no es uno conocido, el de por defecto. */
function leerOrden<Orden extends string>(
  ordenes: readonly Orden[],
  porDefecto: Orden,
): Orden {
  const valor = parametro(PARAMETRO_ORDEN);
  return ordenes.find((orden) => orden === valor) ?? porDefecto;
}

export interface FiltroEnUrl<Orden extends string> {
  /** Lo que se ve en el campo de búsqueda, al instante. */
  busqueda: string;
  /** La búsqueda para el servidor: sin espacios y al dejar de escribir. */
  busquedaParaApi: string;
  pagina: number;
  orden: Orden;
  /** Otra búsqueda, otros resultados: vuelve a la primera página. */
  cambiarBusqueda: (busqueda: string) => void;
  /** Otro orden: la página 3 ya no muestra lo mismo, vuelve a la primera. */
  cambiarOrden: (orden: Orden) => void;
  cambiarPagina: (pagina: number) => void;
}

/**
 * Búsqueda, página y orden de un listado, guardados en la URL
 * (`?buscar=&pagina=&orden=`): se pueden enlazar, recargar y volver atrás.
 *
 * @param ordenes - Los órdenes válidos: uno desconocido en la URL se ignora.
 * @param ordenPorDefecto - El que se usa sin `?orden=`; no ensucia la URL.
 */
export function useFiltroEnUrl<Orden extends string>(
  ordenes: readonly Orden[],
  ordenPorDefecto: Orden,
): FiltroEnUrl<Orden> {
  const [busqueda, setBusqueda] = useState(
    () => parametro(PARAMETRO_BUSQUEDA) ?? '',
  );
  const [pagina, setPagina] = useState(leerPagina);
  const [orden, setOrden] = useState(() => leerOrden(ordenes, ordenPorDefecto));
  // El campo responde de inmediato; al servidor se le pregunta al dejar de
  // escribir, no una vez por tecla.
  const busquedaParaApi = useValorConRetraso(
    busqueda.trim(),
    RETRASO_BUSQUEDA_MS,
  );

  // La URL es un sistema externo: un efecto la sincroniza venga de donde venga
  // el cambio. Los valores por defecto (sin búsqueda, primera página) no la
  // ensucian.
  useEffect(() => {
    const url = new URL(window.location.href);
    const fijar = (nombre: string, valor: string | null) =>
      valor === null
        ? url.searchParams.delete(nombre)
        : url.searchParams.set(nombre, valor);
    fijar(PARAMETRO_BUSQUEDA, busqueda.trim() || null);
    fijar(PARAMETRO_PAGINA, pagina > 1 ? String(pagina) : null);
    fijar(PARAMETRO_ORDEN, orden !== ordenPorDefecto ? orden : null);
    window.history.replaceState(window.history.state, '', url);
  }, [busqueda, pagina, orden, ordenPorDefecto]);

  return {
    busqueda,
    busquedaParaApi,
    pagina,
    orden,
    cambiarBusqueda: (valor) => {
      setBusqueda(valor);
      setPagina(1);
    },
    cambiarOrden: (valor) => {
      setOrden(valor);
      setPagina(1);
    },
    cambiarPagina: setPagina,
  };
}
