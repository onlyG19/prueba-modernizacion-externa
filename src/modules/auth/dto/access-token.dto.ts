import { ApiProperty } from '@nestjs/swagger';
import { ROLES, type Rol } from '../rol';

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

  /**
   * Rol de la sesión: `admin` además puede crear cuentas. Va también dentro
   * del token, que es lo que la API verifica; aquí es para que el cliente
   * adapte su interfaz sin decodificar el JWT.
   * @example 'admin'
   */
  @ApiProperty({ enum: ROLES })
  rol!: Rol;
}
