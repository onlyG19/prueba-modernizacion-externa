import { useSyncExternalStore } from 'react';

/*
 * Enrutador mínimo sobre la History API. Son cinco rutas fijas: una librería
 * de enrutamiento sumaría una dependencia para resolver lo que aquí hacen
 * `pushState` y un evento.
 *
 * La URL es un sistema externo a React: se lee con `useSyncExternalStore`, que
 * garantiza que todos los componentes vean la misma ruta en un mismo render.
 */

/** `pushState` no avisa a nadie (a diferencia de atrás/adelante): se avisa con este evento. */
const EVENTO_NAVEGACION = 'navegacion';

function suscribir(avisar: () => void) {
  window.addEventListener('popstate', avisar);
  window.addEventListener(EVENTO_NAVEGACION, avisar);
  return () => {
    window.removeEventListener('popstate', avisar);
    window.removeEventListener(EVENTO_NAVEGACION, avisar);
  };
}

const leerRuta = () => window.location.pathname;

/** La ruta actual (`pathname`); el componente se vuelve a renderizar al navegar. */
export function useRuta(): string {
  return useSyncExternalStore(suscribir, leerRuta);
}

export interface OpcionesNavegar {
  /**
   * Reemplaza la entrada actual del historial en vez de agregar una: para
   * redirecciones, así "atrás" no vuelve a una página que redirige otra vez.
   */
  reemplazar?: boolean;
}

/**
 * Navega dentro de la aplicación sin recargar la página.
 *
 * @param destino - Ruta del mismo sitio; puede traer query (`/ingresar?volver=…`).
 */
export function navegar(
  destino: string,
  { reemplazar = false }: OpcionesNavegar = {},
) {
  const url = new URL(destino, window.location.origin);
  if (reemplazar) {
    window.history.replaceState(null, '', url);
  } else {
    window.history.pushState(null, '', url);
    // Una página nueva empieza arriba, como al seguir un enlace normal.
    window.scrollTo({ top: 0 });
  }
  window.dispatchEvent(new Event(EVENTO_NAVEGACION));
}

/** Un parámetro de la query actual (`?volver=…`), o `null` si no viene. */
export function leerParametro(nombre: string): string | null {
  return new URLSearchParams(window.location.search).get(nombre);
}
