/**
 * Respuesta del login.
 *
 * @remarks
 * Es una clase y no una `interface` porque las interfaces desaparecen al
 * compilar, y Swagger necesita algo que exista en tiempo de ejecución para
 * documentar el esquema.
 */
export class AccessTokenDto {
  /**
   * JWT a enviar en el header `Authorization: Bearer <token>`.
   * @example 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiJ9.firma'
   */
  accessToken!: string;

  /**
   * Tipo de token (siempre `Bearer`).
   * @example 'Bearer'
   */
  tokenType!: 'Bearer';

  /**
   * Segundos de vigencia del token.
   * @example 3600
   */
  expiresIn!: number;
}
