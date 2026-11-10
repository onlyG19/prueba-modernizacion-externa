import {
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import estilos from './Dialogo.module.css';

interface PropsDialogo {
  /** Id del título del diálogo: es su nombre accesible. */
  idTitulo: string;
  /** Se llama al pedir cerrar: Escape, clic en el fondo o el botón Cerrar. */
  onCerrar: () => void;
  children: ReactNode;
}

/**
 * Ventana modal sobre el `<dialog>` nativo, abierto con `showModal()`: el
 * navegador ya encierra el foco dentro, deja inerte el resto de la página
 * (ni el teclado ni el lector de pantalla salen del diálogo) y lo pinta sobre
 * todo lo demás. Se abre al montarse; quien lo usa lo cierra desmontándolo.
 */
export function Dialogo({ idTitulo, onCerrar, children }: PropsDialogo) {
  const ref = useRef<HTMLDialogElement>(null);
  const pulsoEnElFondo = useRef(false);

  // Layout effect: el diálogo queda abierto antes de los efectos de sus hijos,
  // así un formulario dentro puede enfocar su primer campo al montarse.
  useLayoutEffect(() => {
    const dialogo = ref.current;
    // En StrictMode el efecto corre dos veces, y `showModal()` sobre un
    // diálogo ya abierto lanza un error.
    if (dialogo && !dialogo.open) {
      dialogo.showModal();
    }
  }, []);

  // Escape se maneja aquí y no con el evento `cancel` nativo: así el cierre
  // pasa siempre por `onCerrar` y se comporta igual en todos los navegadores.
  function cerrarConEscape(evento: KeyboardEvent<HTMLDialogElement>) {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      onCerrar();
    }
  }

  // El `<dialog>` no tiene relleno: un clic sobre el propio elemento es un
  // clic en el fondo. Se exige que también la pulsación empiece ahí, para no
  // cerrar al seleccionar texto de un campo y soltar el mouse fuera.
  function recordarPulsacion(evento: PointerEvent<HTMLDialogElement>) {
    pulsoEnElFondo.current = evento.target === evento.currentTarget;
  }

  function cerrarConClicEnElFondo(evento: MouseEvent<HTMLDialogElement>) {
    if (pulsoEnElFondo.current && evento.target === evento.currentTarget) {
      onCerrar();
    }
  }

  return (
    <dialog
      ref={ref}
      className={estilos.dialogo}
      aria-labelledby={idTitulo}
      onKeyDown={cerrarConEscape}
      onPointerDown={recordarPulsacion}
      onClick={cerrarConClicEnElFondo}
      // Un cierre nativo (p. ej. el gesto "atrás" en Android) también avisa.
      onClose={onCerrar}
    >
      <div className={estilos.contenido}>{children}</div>
    </dialog>
  );
}
