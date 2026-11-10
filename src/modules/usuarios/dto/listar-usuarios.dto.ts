// [ANTES] import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { NormalizeWhitespace } from '../../../common/decorators/normalize-whitespace.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Parámetros de `GET /usuarios`: paginación y búsqueda. */
export class ListarUsuariosDto extends PaginationQueryDto {
  /**
   * Texto a buscar en el nombre (sin distinguir tildes ni mayúsculas) o en el
   * RUT (con o sin puntos y guion).
   * @example 'perez'
   */
  @IsOptional()
  // [ANTES] @Transform(({ value }: { value: unknown }) =>
  // [ANTES]   typeof value === 'string' ? value.trim() : value,
  // [ANTES] )
  // [ANTES] @IsString()
  // [ANTES] @MaxLength(50)
  @NormalizeWhitespace()
  @IsString({ message: 'buscar debe ser texto' })
  @MaxLength(50, { message: 'buscar no puede superar los 50 caracteres' })
  buscar?: string;
}
