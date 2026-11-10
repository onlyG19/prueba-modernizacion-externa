// [ANTES] import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { Rut } from '../domain/rut';
import { NOMBRE_MAX_LENGTH } from '../domain/usuario.constants';
import { IsRut } from '../validators/is-rut.decorator';

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  // [ANTES] @MaxLength(45, { message: 'El nombre no puede superar los 45 caracteres' })
  @MaxLength(NOMBRE_MAX_LENGTH, {
    message: `El nombre no puede superar los ${NOMBRE_MAX_LENGTH} caracteres`,
  })
  nombre: string;

  // [ANTES] @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? Rut.normalizar(value) : value,
  )
  @IsNotEmpty({ message: 'El RUT no puede estar vacío' })

  // [ANTES] @MaxLength(12, { message: 'El RUT no puede superar los 12 caracteres' })
  // [ANTES] @Matches(/^\d{1,8}-[\dkK]$/, {
  // [ANTES]   message: 'El RUT debe tener el formato válido chileno (ej: 12345678-9)',
  // [ANTES] })
  @IsRut()
  rut: string;
}
