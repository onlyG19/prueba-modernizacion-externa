import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { RUT_MAX_LENGTH } from '../domain/rut';
import { NOMBRE_MAX_LENGTH } from '../domain/usuario.constants';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  // [ANTES] @Column({ type: 'varchar', length: 45 })
  @Column({ type: 'varchar', length: NOMBRE_MAX_LENGTH })
  nombre: string;

  // [ANTES] @Column({ type: 'varchar', length: 12 })
  @Column({ type: 'varchar', length: RUT_MAX_LENGTH, unique: true })
  rut: string;
}
