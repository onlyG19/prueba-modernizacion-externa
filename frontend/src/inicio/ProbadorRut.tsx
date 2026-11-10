import { Rut } from '@dominio/rut';
import { useId, useState, type ReactNode } from 'react';
import { IconoTarjeta } from '../ui/iconos';
import { CampoRut } from '../usuarios/rut/CampoRut';
import {
  verificarRut,
  type VerificacionRut,
} from '../usuarios/rut/formato-rut';
import estilos from './ProbadorRut.module.css';

/** Qué decirle a la persona según lo que lleva escrito. */
function resultado(verificacion: VerificacionRut, valor: string): ReactNode {
  switch (verificacion.estado) {
    case 'vacio':
      return 'Aquí verás si el dígito verificador corresponde.';
    case 'incompleto':
      return 'Sigue escribiendo: el último carácter es el dígito verificador.';
    case 'invalido':
      return `Con este número, el dígito verificador debería ser ${verificacion.dvEsperado}.`;
    case 'valido':
      return (
        <>
          El dígito verificador corresponde. Se guarda sin puntos:{' '}
          {/* Un RUT no se parte en el guion al final de una línea. */}
          <span className={estilos.sinCorte}>{Rut.normalizar(valor)}</span>.
        </>
      );
  }
}

/**
 * El validador de RUT de la consola, para probarlo sin ingresar. Usa el mismo
 * campo y la misma regla (el `Rut` del dominio, compartido con el backend) que
 * el formulario de registro.
 *
 * @remarks Aquí no se marca en rojo un dígito que no calza: es una prueba, no
 * un error. El resultado se anuncia en una región viva.
 */
export function ProbadorRut() {
  const [valor, setValor] = useState('');
  const id = useId();
  const verificacion = verificarRut(valor);

  return (
    <section className={estilos.probador} aria-labelledby={`${id}-titulo`}>
      <div className={estilos.cabecera}>
        <span className={estilos.icono}>
          <IconoTarjeta tamano={22} />
        </span>
        <h2 id={`${id}-titulo`} className={estilos.titulo}>
          Prueba el validador de RUT
        </h2>
      </div>
      <p className={estilos.texto}>
        Es el mismo que revisa cada registro: escribe un RUT y mira si su dígito
        verificador corresponde.
      </p>

      <CampoRut id={`${id}-rut`} valor={valor} onCambio={setValor} />

      <p className={estilos.resultado} aria-live="polite">
        {resultado(verificacion, valor)}
      </p>

      <details className={estilos.explicacion}>
        <summary>¿Cómo se calcula el dígito verificador?</summary>
        <p>
          Cada dígito del número se multiplica, de derecha a izquierda, por 2,
          3, 4, 5, 6 y 7, volviendo a empezar si hace falta. Se suman los
          resultados y se resta de 11 el resto de dividir esa suma por 11. Si da
          11, el dígito es 0; si da 10, es K.
        </p>
      </details>
    </section>
  );
}
