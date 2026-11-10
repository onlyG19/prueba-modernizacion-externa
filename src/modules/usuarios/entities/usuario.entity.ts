import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { RUT_MAX_LENGTH } from '../domain/rut';
import { NOMBRE_MAX_LENGTH } from '../domain/usuario.constants';

@Entity('usuarios')
export class Usuario {
  /**
   * Identificador del usuario.
   * @example 2
   */
  @PrimaryGeneratedColumn()
  // [ANTES] id: number;
  id!: number;

  /**
   * Nombre del usuario.
   * @example 'Juan Pérez'
   */
  // [ANTES] @Column({ type: 'varchar', length: 45 })
  @Column({ type: 'varchar', length: NOMBRE_MAX_LENGTH })
  // [ANTES] nombre: string;
  nombre!: string;

  /**
   * RUT en forma canónica: sin puntos, con guion y DV en mayúscula.
   * @example '12345678-5'
   */
  // [ANTES] @Column({ type: 'varchar', length: 12 })
  @Column({ type: 'varchar', length: RUT_MAX_LENGTH, unique: true })
  // [ANTES] rut: string;
  rut!: string;
}
