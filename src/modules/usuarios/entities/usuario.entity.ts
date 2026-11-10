import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { RUT_MAX_LENGTH } from '../domain/rut';
import { NOMBRE_MAX_LENGTH } from '../domain/usuario.constants';

@Entity('usuarios')
export class Usuario {
  /**
   * Identificador del usuario (UUID: no revela el orden ni la cantidad).
   * @example '0b5f2c1e-7d4a-4f3b-9a61-2e8c4d7f1a90'
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Nombre del usuario.
   * @example 'Juan Pérez'
   */
  @Column({ type: 'varchar', length: NOMBRE_MAX_LENGTH })
  nombre!: string;

  /**
   * RUT en forma canónica: sin puntos, con guion y DV en mayúscula.
   * @example '12345678-5'
   */
  @Column({ type: 'varchar', length: RUT_MAX_LENGTH, unique: true })
  rut!: string;

  /** Fecha de registro; la pone Postgres al insertar. */
  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;

  /** Fecha del último cambio; TypeORM la actualiza en cada `save`. */
  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn!: Date;

  /** Versión para la concurrencia optimista: sube con cada cambio. */
  @VersionColumn({ default: 1 })
  version!: number;
}
