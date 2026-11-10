import { useLayoutEffect, useRef, type ChangeEvent } from 'react';
import { clases } from '../../ui/clases';
import { IconoVerificado } from '../../ui/iconos';
import estilos from './CampoRut.module.css';
import {
  contarSignificativos,
  formatearRutParcial,
  posicionTrasSignificativos,
  verificarRut,
} from './formato-rut';

interface PropsCampoRut {
  id: string;
  valor: string;
  onCambio: (valor: string) => void;
  onBlur?: () => void;
  /** Error a mostrar bajo el campo (lo decide quien lo usa). */
  error?: string;
}

/**
 * Campo de RUT: lo formatea mientras se escribe (`12.345.678-5`) y confirma
 * en el momento si el dígito verificador corresponde.
 *
 * @remarks
 * Lo positivo se muestra de inmediato ("RUT válido"); el error lo decide el
 * formulario (normalmente al salir del campo o al enviar), para no marcar en
 * rojo un RUT que la persona todavía está escribiendo.
 */
export function CampoRut({
  id,
  valor,
  onCambio,
  onBlur,
  error,
}: PropsCampoRut) {
  const entrada = useRef<HTMLInputElement | null>(null);
  const cursorPendiente = useRef<number | null>(null);

  // Estado derivado durante el render: no necesita estado ni efectos propios.
  const verificacion = verificarRut(valor);
  const idAyuda = `${id}-ayuda`;
  const idEstado = `${id}-estado`;
  const idError = `${id}-error`;

  function manejarCambio(evento: ChangeEvent<HTMLInputElement>) {
    const { value, selectionStart } = evento.target;
    const formateado = formatearRutParcial(value);
    const significativos = contarSignificativos(
      value,
      selectionStart ?? value.length,
    );
    cursorPendiente.current = posicionTrasSignificativos(
      formateado,
      significativos,
    );
    onCambio(formateado);
  }

  // Tras reformatear, el cursor vuelve a su lugar (si no, saltaría al final).
  useLayoutEffect(() => {
    const posicion = cursorPendiente.current;
    const nodo = entrada.current;
    if (posicion === null || !nodo || document.activeElement !== nodo) {
      return;
    }
    nodo.setSelectionRange(posicion, posicion);
    cursorPendiente.current = null;
  }, [valor]);

  return (
    <div className={estilos.campo}>
      <label htmlFor={id} className={estilos.etiqueta}>
        RUT
      </label>
      <p id={idAyuda} className={estilos.ayuda}>
        Con su dígito verificador, por ejemplo 12.345.678-5. Los puntos y el
        guion se agregan solos.
      </p>
      <div
        className={clases(
          estilos.control,
          verificacion.estado === 'valido' && estilos.controlValido,
          error && estilos.controlInvalido,
        )}
      >
        <input
          ref={entrada}
          id={id}
          name="rut"
          className={clases(estilos.entrada, 'cifras')}
          value={valor}
          onChange={manejarCambio}
          onBlur={onBlur}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={clases(idAyuda, idEstado, error && idError)}
        />
        <span id={idEstado} className={estilos.estado} aria-live="polite">
          {verificacion.estado === 'valido' ? (
            <span className={estilos.sello}>
              <IconoVerificado />
              RUT válido
            </span>
          ) : null}
        </span>
      </div>
      {/* Región viva persistente: el error se anuncia al aparecer. */}
      <div id={idError} aria-live="polite">
        {error ? <p className={estilos.error}>{error}</p> : null}
      </div>
    </div>
  );
}
