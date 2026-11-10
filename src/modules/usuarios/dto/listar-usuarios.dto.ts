import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Parámetros de `GET /usuarios`: paginación y búsqueda. */
export class ListarUsuariosDto extends PaginationQueryDto {
  /**
   * Texto a buscar en el nombre (sin distinguir tildes ni mayúsculas) o en el
   * RUT (con o sin puntos y guion).
   * @example 'perez'
   */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(50)
  buscar?: string;
}
