import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { USERNAME_MAX_LENGTH } from '../domain/credenciales';

/**
 * Cuenta para ingresar a la consola. Las crea el administrador (el del
 * `.env`); quien ingresa con una de ellas tiene rol `operador`.
 */
@Entity('cuentas')
export class Cuenta {
  /**
   * Identificador de la cuenta (UUID).
   * @example '5d2c9e1a-3b7f-4c8d-9e6a-1f2b3c4d5e6f'
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Usuario con que se ingresa, en minúsculas.
   * @example 'maria.lopez'
   */
  @Column({ type: 'varchar', length: USERNAME_MAX_LENGTH, unique: true })
  username!: string;

  /** Hash scrypt de la contraseña (`<sal>:<clave>`); nunca la contraseña. */
  @Column({ name: 'password_hash', type: 'text' })
  passwordHash!: string;

  /** Fecha de creación; la pone Postgres al insertar. */
  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;
}
