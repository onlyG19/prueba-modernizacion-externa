/**
 * Largo máximo de un RUT en su forma canónica: 8 dígitos de cuerpo + guion
 * + dígito verificador.
 *
 * @remarks
 * Esta es la fuente de verdad para el largo del RUT: la usa la entidad
 * (`length` de la columna).
 * El DTO no la necesita porque `@IsRut()` ya
 * garantiza el largo.
 */
export const RUT_MAX_LENGTH = 10;

/**
 * Formato canónico del RUT: de 1 a 8 dígitos, guion y un dígito verificador
 * (`0`-`9` o `K` mayúscula). Captura el cuerpo en el grupo 1 y el dígito
 * verificador en el grupo 2.
 */
const RUT_FORMATO = /^(\d{1,8})-([\dK])$/;

/**
 * Error que se lanza cuando un valor no corresponde a un RUT válido,
 * ya sea por formato o por dígito verificador incorrecto.
 *
 * @remarks
 * Es intencionalmente independiente de HTTP: traducirlo a una respuesta
 * `400 Bad Request` es responsabilidad de las capas externas (DTO o controller).
 */
export class RutInvalidoError extends Error {
  /**
   * @param valor - Valor original recibido, tal como llegó (antes de normalizar).
   */
  constructor(valor: string) {
    super(`El RUT "${valor}" no es válido`);
    this.name = 'RutInvalidoError';
  }
}

/**
 * Value object que representa un RUT chileno válido.
 *
 * @remarks
 * - Es inmutable: sus propiedades son `readonly`.
 * - Su constructor es privado: la única forma de obtener una instancia es
 *   {@link Rut.crear}, por lo que toda instancia de `Rut` está garantizada
 *   como válida.
 * - Se compara por valor mediante {@link Rut.equals}, no por referencia.
 *
 * @example
 * ```ts
 * const rut = Rut.crear('12.345.678-5');
 * rut.toString();  // "12345678-5"
 * rut.formatear(); // "12.345.678-5"
 * ```
 */
export class Rut {
  /**
   * @param cuerpo - Dígitos del RUT sin el dígito verificador (ej: `"12345678"`).
   * @param dv - Dígito verificador ya validado: `"0"`-`"9"` o `"K"`.
   */
  private constructor(
    private readonly cuerpo: string,
    private readonly dv: string,
  ) {}

  /**
   * Crea un `Rut` a partir de un texto, normalizándolo y validando su formato
   * y su dígito verificador.
   *
   * @param valor - RUT en cualquier formato aceptado por {@link Rut.normalizar}
   *   (con o sin puntos, guion, espacios o ceros a la izquierda).
   * @returns Una instancia de `Rut` válida.
   * @throws {@link RutInvalidoError} Si el formato es incorrecto o el dígito
   *   verificador no coincide con el calculado.
   *
   * @example
   * ```ts
   * Rut.crear('12.345.678-5'); // OK
   * Rut.crear('12345678-9');   // lanza RutInvalidoError (el DV correcto es 5)
   * ```
   */
  static crear(valor: string): Rut {
    const normalizado = Rut.normalizar(valor);
    const valido = RUT_FORMATO.exec(normalizado);
    if (!valido) {
      throw new RutInvalidoError(valor);
    }

    const [, cuerpo, dv] = valido;

    if (Rut.calcularDv(cuerpo) !== dv) {
      throw new RutInvalidoError(valor);
    }

    return new Rut(cuerpo, dv);
  }

  /**
   * Indica si un texto corresponde a un RUT válido, sin lanzar excepciones.
   *
   * @param valor - RUT en cualquier formato aceptado por {@link Rut.normalizar}.
   * @returns `true` si el RUT es válido; `false` en caso contrario.
   *
   * @example
   * ```ts
   * Rut.esValido('12345678-5'); // true
   * Rut.esValido('12345678-9'); // false
   * ```
   */
  static esValido(valor: string): boolean {
    try {
      Rut.crear(valor);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Lleva un RUT escrito por una persona a su forma canónica `cuerpo-DV`:
   * quita puntos, espacios, guiones y ceros a la izquierda, pasa la `k` a
   * mayúscula y vuelve a insertar el guion antes del último carácter.
   *
   * @remarks
   * No valida: solo limpia. Cualquier otro carácter (por ejemplo una letra en
   * el cuerpo) se conserva para que la validación posterior lo rechace, en vez
   * de eliminarlo silenciosamente.
   *
   * @param valor - Texto a normalizar.
   * @returns El RUT normalizado. Si tiene menos de 2 caracteres útiles, se
   *   devuelve tal cual (sin guion).
   *
   * @example
   * ```ts
   * Rut.normalizar('12.345.678-k');  // "12345678-K"
   * Rut.normalizar('123456785');     // "12345678-5"
   * Rut.normalizar(' 012345678-5 '); // "12345678-5"
   * ```
   */
  static normalizar(valor: string): string {
    const limpio = valor
      .replace(/[.\s-]/g, '')
      .toUpperCase()
      .replace(/^0+/, '');

    if (limpio.length < 2) {
      return limpio;
    }
    return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
  }

  /**
   * Calcula el dígito verificador de un RUT con el algoritmo módulo 11.
   *
   * @remarks
   * Recorre los dígitos de derecha a izquierda multiplicándolos por la serie
   * 2, 3, 4, 5, 6, 7 (y vuelve a 2), suma los productos y aplica
   * `11 - (suma % 11)`: si el resultado es 11 el DV es `"0"`, si es 10 es
   * `"K"`, y en otro caso es el número mismo.
   *
   * @param cuerpo - Solo los dígitos del RUT, sin puntos, guion ni DV.
   * @returns El dígito verificador: `"0"`-`"9"` o `"K"`.
   *
   * @example
   * ```ts
   * Rut.calcularDv('12345678'); // "5"
   * ```
   */
  static calcularDv(cuerpo: string): string {
    let suma = 0;
    let multiplicador = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += Number(cuerpo[i]) * multiplicador;
      multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }

    const resultado = 11 - (suma % 11);
    if (resultado === 11) {
      return '0';
    }
    if (resultado === 10) {
      return 'K';
    }
    return String(resultado);
  }

  /**
   * Compara dos RUT por valor.
   *
   * @param otro - RUT con el que comparar.
   * @returns `true` si ambos representan el mismo RUT.
   */
  equals(otro: Rut): boolean {
    return this.toString() === otro.toString();
  }

  /**
   * Devuelve la forma canónica del RUT, la que se debe usar para guardarlo y
   * compararlo.
   *
   * @returns El RUT con formato `cuerpo-DV`, sin puntos (ej: `"12345678-5"`).
   */
  toString(): string {
    return `${this.cuerpo}-${this.dv}`;
  }

  /**
   * Devuelve el RUT con separadores de miles, pensado para mostrarlo a una
   * persona.
   *
   * @returns El RUT con formato `xx.xxx.xxx-DV` (ej: `"12.345.678-5"`).
   */
  formatear(): string {
    const conPuntos = this.cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${conPuntos}-${this.dv}`;
  }
}
