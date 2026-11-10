/**
 * Sin caracteres que se confunden al leerlos o dictarlos (`0`/`O`, `1`/`l`/`I`):
 * la contraseña generada se le entrega a otra persona.
 */
const ALFABETO = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** 16 caracteres de 56 posibles: unos 93 bits de entropía. */
export const LARGO_GENERADA = 16;

/**
 * Bytes a partir de este valor se descartan: si se usaran con `%`, los
 * primeros caracteres del alfabeto saldrían más seguido que el resto (sesgo
 * del módulo).
 */
const LIMITE_SIN_SESGO = 256 - (256 % ALFABETO.length);

/**
 * Una contraseña al azar, con el generador criptográfico del navegador
 * (`crypto.getRandomValues`; `Math.random` es predecible).
 */
export function generarContrasena(largo: number = LARGO_GENERADA): string {
  let contrasena = '';
  while (contrasena.length < largo) {
    for (const byte of crypto.getRandomValues(new Uint8Array(largo))) {
      if (byte < LIMITE_SIN_SESGO && contrasena.length < largo) {
        contrasena += ALFABETO[byte % ALFABETO.length];
      }
    }
  }
  return contrasena;
}
