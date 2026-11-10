import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { NormalizeWhitespace } from '../../../common/decorators/normalize-whitespace.decorator';
import { Rut } from '../domain/rut';
import { NOMBRE_MAX_LENGTH } from '../domain/usuario.constants';
import { IsRut } from '../validators/is-rut.decorator';

export class CreateUsuarioDto {
  /**
   * Nombre del usuario.
   * Se guarda sin espacios de sobra: `"  Juan   Pérez "` queda `"Juan Pérez"`.
   * @example 'Juan Pérez'
   */
  // Antes de validar: un nombre de solo espacios llega vacío a @IsNotEmpty.
  @NormalizeWhitespace()
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MaxLength(NOMBRE_MAX_LENGTH, {
    message: `El nombre no puede superar los ${NOMBRE_MAX_LENGTH} caracteres`,
  })
  nombre!: string;

  /**
   * RUT chileno con dígito verificador válido. Se acepta con o sin puntos,
   * guion o ceros a la izquierda, y se guarda normalizado (`12345678-5`).
   * @example '12.345.678-5'
   */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? Rut.normalizar(value) : value,
  )
  @IsNotEmpty({ message: 'El RUT no puede estar vacío' })
  @IsRut()
  rut!: string;
}
