/**
 * Datos de prueba únicos por test. Los e2e comparten una base que solo se
 * vacía al empezar la corrida: con nombres, RUT y usuarios propios, cada test
 * encuentra solo lo suyo, sin importar el orden ni cuántas veces se repita.
 */

/** Sufijo corto y al azar (p. ej. `k3f9q`) para distinguir los datos de cada test. */
export function etiquetaUnica(): string {
  return Math.random().toString(36).slice(2, 7);
}

/** Un RUT en las tres formas que aparecen en los tests. */
export interface RutDePrueba {
  /** Como lo guarda y lo devuelve la API: `12345678-5`. */
  normalizado: string;
  /** Como lo muestra la interfaz: `12.345.678-5`. */
  formateado: string;
  /** Como lo teclea una persona, sin puntos ni guion: `123456785`. */
  tecleado: string;
}

/** Dígito verificador de un RUT chileno (módulo 11). */
function digitoVerificador(numero: number): string {
  let suma = 0;
  let factor = 2;
  for (const digito of String(numero).split('').reverse()) {
    suma += Number(digito) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) {
    return '0';
  }
  return resto === 10 ? 'K' : String(resto);
}

/** Un RUT válido para un número dado. */
export function rutDe(numero: number): RutDePrueba {
  const dv = digitoVerificador(numero);
  const conPuntos = new Intl.NumberFormat('es-CL').format(numero);
  return {
    normalizado: `${numero}-${dv}`,
    formateado: `${conPuntos}-${dv}`,
    tecleado: `${numero}${dv}`,
  };
}

/** Un RUT válido al azar, de 8 dígitos. */
export function rutAlAzar(): RutDePrueba {
  return rutDe(30_000_000 + Math.floor(Math.random() * 69_999_999));
}
