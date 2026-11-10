/*
 * Ayudas para escribir un RUT en un campo de texto. La regla de negocio (el
 * dígito verificador) no se reimplementa: es la clase `Rut` del backend,
 * compartida mediante el alias `@dominio`.
 */
import { Rut } from '@dominio/rut';

/** 8 dígitos de cuerpo + el dígito verificador. */
const MAX_SIGNIFICATIVOS = 9;
const NO_SIGNIFICATIVO = /[^0-9K]/g;
const SIGNIFICATIVO = /[0-9K]/i;
const SEPARADOR_MILES = /\B(?=(\d{3})+(?!\d))/g;

/**
 * Deja solo los caracteres que forman el RUT: dígitos y una K final (el DV),
 * sin ceros a la izquierda y con un máximo de 9 caracteres.
 *
 * @example
 * ```ts
 * limpiarRut('12.345.678-k'); // '12345678K'
 * ```
 */
export function limpiarRut(valor: string): string {
  const caracteres = valor.toUpperCase().replace(NO_SIGNIFICATIVO, '');
  const cuerpo = caracteres.slice(0, -1).replace(/K/g, '');
  const dv = caracteres.slice(-1);
  return `${cuerpo}${dv}`.replace(/^0+/, '').slice(0, MAX_SIGNIFICATIVOS);
}

/**
 * Formatea el RUT mientras se escribe: el último carácter se toma como DV.
 *
 * @example
 * ```ts
 * formatearRutParcial('123456785'); // '12.345.678-5'
 * formatearRutParcial('1234');      // '123-4'
 * ```
 */
export function formatearRutParcial(valor: string): string {
  const limpio = limpiarRut(valor);
  if (limpio.length < 2) {
    return limpio;
  }
  const cuerpo = limpio.slice(0, -1).replace(SEPARADOR_MILES, '.');
  return `${cuerpo}-${limpio.slice(-1)}`;
}

/** Cuántos caracteres del RUT (dígitos o K) hay antes de `posicion`. */
export function contarSignificativos(texto: string, posicion: number): number {
  let cuenta = 0;
  for (let i = 0; i < Math.min(posicion, texto.length); i++) {
    if (SIGNIFICATIVO.test(texto[i])) {
      cuenta++;
    }
  }
  return cuenta;
}

/**
 * Posición del cursor en `formateado` justo después del carácter significativo
 * número `cuenta`. Así el cursor no salta al final al editar en medio del RUT.
 */
export function posicionTrasSignificativos(
  formateado: string,
  cuenta: number,
): number {
  if (cuenta <= 0) {
    return 0;
  }
  let vistos = 0;
  for (let i = 0; i < formateado.length; i++) {
    if (SIGNIFICATIVO.test(formateado[i])) {
      vistos++;
      if (vistos === cuenta) {
        return i + 1;
      }
    }
  }
  return formateado.length;
}

export type VerificacionRut =
  | { estado: 'vacio' }
  | { estado: 'incompleto' }
  | { estado: 'invalido'; dvEsperado: string }
  | { estado: 'valido'; formateado: string };

/** Verifica el RUT escrito con el algoritmo módulo 11 del dominio. */
export function verificarRut(valor: string): VerificacionRut {
  const limpio = limpiarRut(valor);
  if (limpio.length === 0) {
    return { estado: 'vacio' };
  }
  if (limpio.length < 2) {
    return { estado: 'incompleto' };
  }
  if (Rut.esValido(limpio)) {
    return { estado: 'valido', formateado: Rut.crear(limpio).formatear() };
  }
  return {
    estado: 'invalido',
    dvEsperado: Rut.calcularDv(limpio.slice(0, -1)),
  };
}
