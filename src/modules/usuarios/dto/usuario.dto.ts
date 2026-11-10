import { Usuario } from '../entities/usuario.entity';

/**
 * Un usuario tal como lo entrega la API.
 *
 * @remarks La API no devuelve la entidad de TypeORM: así una columna nueva (o
 * interna) no se publica sin querer, y la base puede cambiar sin romper a los
 * clientes. La conversión es explícita (`desde`), sin serializar por
 * reflexión: lo que sale es exactamente lo que se lista aquí.
 */
export class UsuarioDto {
  /**
   * Identificador del usuario.
   * @example 2
   */
  id!: number;

  /**
   * Nombre del usuario.
   * @example 'Juan Pérez'
   */
  nombre!: string;

  /**
   * RUT en forma canónica: sin puntos, con guion y DV en mayúscula.
   * @example '12345678-5'
   */
  rut!: string;

  /**
   * Fecha de registro (ISO 8601).
   * @example '2026-11-10T14:03:00.000Z'
   */
  creadoEn!: Date;

  /**
   * Fecha del último cambio (ISO 8601).
   * @example '2026-11-10T15:20:00.000Z'
   */
  actualizadoEn!: Date;

  /** Convierte la entidad en la respuesta de la API. */
  static desde(usuario: Usuario): UsuarioDto {
    // [ANTES] return { id: usuario.id, nombre: usuario.nombre, rut: usuario.rut };
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      rut: usuario.rut,
      creadoEn: usuario.creadoEn,
      actualizadoEn: usuario.actualizadoEn,
    };
  }
}
