import { BotonSecundario } from './botones';
import estilos from './Paginacion.module.css';

interface Props {
  /** Nombre de la navegación para el lector (p. ej. «Páginas de usuarios»). */
  etiqueta: string;
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
}

/** Anterior y siguiente; no se muestra si todo cabe en una página. */
export function Paginacion({
  etiqueta,
  pagina,
  totalPaginas,
  onCambiar,
}: Props) {
  if (totalPaginas <= 1) {
    return null;
  }
  const esPrimera = pagina <= 1;
  const esUltima = pagina >= totalPaginas;

  /*
   * `aria-disabled` y no `disabled`: un botón deshabilitado pierde el foco, y
   * quien avanza con el teclado quedaría perdido al llegar a la última página.
   */
  return (
    <nav className={estilos.paginacion} aria-label={etiqueta}>
      <BotonSecundario
        onClick={() => {
          if (!esPrimera) {
            onCambiar(pagina - 1);
          }
        }}
        aria-disabled={esPrimera || undefined}
      >
        Anterior
      </BotonSecundario>
      {/* Anuncia la página completa, no solo el número que cambió. */}
      <p className={estilos.posicion} aria-live="polite" aria-atomic="true">
        Página {pagina} de {totalPaginas}
      </p>
      <BotonSecundario
        onClick={() => {
          if (!esUltima) {
            onCambiar(pagina + 1);
          }
        }}
        aria-disabled={esUltima || undefined}
      >
        Siguiente
      </BotonSecundario>
    </nav>
  );
}
