/**
 * Error en formato Problem Details (RFC 9457), enviado con
 * `Content-Type: application/problem+json`. Es el formato de todas las
 * respuestas de error de la API (ver `ProblemDetailsFilter`).
 */
export class ProblemDetailsDto {
  /**
   * URI que identifica el tipo de problema. `about:blank` indica que basta con
   * el código HTTP: el `title` es entonces la frase estándar de ese código.
   * @example 'about:blank'
   */
  // [ANTES] type: string;
  type!: string;

  /**
   * Resumen del problema (la frase estándar del código HTTP).
   * @example 'Conflict'
   */
  // [ANTES] title: string;
  title!: string;

  /**
   * Código de estado HTTP.
   * @example 409
   */
  // [ANTES] status: number;
  status!: number;

  /**
   * Explicación de esta ocurrencia del problema.
   * @example 'Ya existe un usuario con el RUT 12345678-5'
   */
  // [ANTES] detail: string;
  detail!: string;

  /**
   * Ruta de la petición que falló (sin query string, para no repetir datos
   * personales como un RUT buscado).
   * @example '/usuarios'
   */
  // [ANTES] instance: string;
  instance!: string;

  /**
   * Reglas de validación incumplidas, una por elemento (solo en errores 400).
   * @example ['rut debe ser un RUT válido (ej: 12.345.678-5)']
   */
  errors?: string[];
}
