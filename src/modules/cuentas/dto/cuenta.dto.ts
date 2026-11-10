import { Cuenta } from '../entities/cuenta.entity';

/**
 * Una cuenta tal como la entrega la API: sin el hash de la contraseña.
 *
 * @remarks Como `UsuarioDto`, la conversión es explícita (`desde`): una
 * columna nueva o interna nunca se publica sin querer.
 */
export class CuentaDto {
  /**
   * Identificador de la cuenta (UUID).
   * @example '5d2c9e1a-3b7f-4c8d-9e6a-1f2b3c4d5e6f'
   */
  id!: string;

  /**
   * Usuario con que se ingresa, en minúsculas.
   * @example 'maria.lopez'
   */
  username!: string;

  /**
   * Fecha de creación (ISO 8601).
   * @example '2026-11-10T14:03:00.000Z'
   */
  creadoEn!: Date;

  /** Convierte la entidad en la respuesta de la API. */
  static desde(cuenta: Cuenta): CuentaDto {
    return {
      id: cuenta.id,
      username: cuenta.username,
      creadoEn: cuenta.creadoEn,
    };
  }
}
