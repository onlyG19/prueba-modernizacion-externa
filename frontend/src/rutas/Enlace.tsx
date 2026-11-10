import { useLayoutEffect, type ComponentProps, type MouseEvent } from 'react';
import { navegar, useRuta } from './navegacion';

type PropsEnlace = ComponentProps<'a'> & { href: string };

/**
 * Enlace interno: navega sin recargar la página. Sigue siendo un `<a>` de
 * verdad, así que con Ctrl/⌘, Shift o el botón central se abre en otra pestaña
 * como cualquier enlace, y el lector de pantalla lo anuncia como enlace.
 */
export function Enlace({ href, onClick, target, ...props }: PropsEnlace) {
  function manejarClic(evento: MouseEvent<HTMLAnchorElement>) {
    onClick?.(evento);
    const abreEnOtraPestana =
      evento.button !== 0 ||
      evento.metaKey ||
      evento.ctrlKey ||
      evento.shiftKey ||
      evento.altKey ||
      (target !== undefined && target !== '_self');
    if (evento.defaultPrevented || abreEnOtraPestana) {
      return;
    }
    evento.preventDefault();
    navegar(href);
  }

  return <a {...props} href={href} target={target} onClick={manejarClic} />;
}

/**
 * Enlace de una barra de navegación: el de la página actual lleva
 * `aria-current="page"` (lo anuncia el lector y lo usa el CSS). Con
 * `seccion`, también queda marcado en las páginas que cuelgan de él, pero con
 * `data-seccion-activa`: `aria-current="page"` es solo para la página exacta.
 */
export function EnlaceNav({
  seccion = false,
  ...props
}: PropsEnlace & { seccion?: boolean }) {
  const ruta = useRuta();
  const esLaPagina = ruta === props.href;
  const enLaSeccion = seccion && ruta.startsWith(`${props.href}/`);
  return (
    <Enlace
      {...props}
      aria-current={esLaPagina ? 'page' : undefined}
      data-seccion-activa={esLaPagina || enLaSeccion || undefined}
    />
  );
}

/**
 * Redirige al montarse (sin agregar una entrada al historial). Se usa en el
 * layout effect: la redirección ocurre antes de pintar, sin parpadeo.
 */
export function Redirigir({ a }: { a: string }) {
  useLayoutEffect(() => {
    navegar(a, { reemplazar: true });
  }, [a]);
  return null;
}
