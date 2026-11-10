import { IconoVerificado } from '../ui/iconos';
import estilos from './IlustracionCredencial.module.css';

/**
 * Una credencial con un RUT verificado: lo que la consola resguarda. Es
 * decorativa (`aria-hidden`): los datos son de ejemplo, no de una persona.
 */
export function IlustracionCredencial() {
  return (
    <div className={estilos.escena} aria-hidden="true">
      <div className={estilos.fondo} />
      <div className={estilos.credencial}>
        <div className={estilos.cabecera}>
          <span className={estilos.chip} />
          <span className={estilos.lineaCorta} />
        </div>
        <div className={estilos.cuerpo}>
          <span className={estilos.avatar}>AR</span>
          <div className={estilos.datos}>
            <span className={estilos.nombre}>Ana Rojas</span>
            <span className={estilos.rut}>11.111.111-1</span>
            <span className={estilos.sello}>
              <IconoVerificado tamano={14} />
              RUT válido
            </span>
          </div>
        </div>
        <div className={estilos.pie}>
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
