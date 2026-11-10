// [ANTES] import { Transform } from 'class-transformer';
// [ANTES] import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { NormalizeWhitespace } from '../../../common/decorators/normalize-whitespace.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/**
 * Órdenes posibles de la lista: por nombre o por fecha de registro. Con `-`
 * delante, de mayor a menor (`-creadoEn`: los más recientes primero).
 */
export const ORDENES_USUARIOS = [
  'nombre',
  '-nombre',
  'creadoEn',
  '-creadoEn',
] as const;
export type OrdenUsuarios = (typeof ORDENES_USUARIOS)[number];

// [ANTES] /** Parámetros de `GET /usuarios`: paginación y búsqueda. */
/** Parámetros de `GET /usuarios`: paginación, búsqueda y orden. */
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

  /**
   * Orden de la lista: `nombre` (por defecto) o `creadoEn`; con `-` delante,
   * descendente.
   * @example '-creadoEn'
   */
  @ApiPropertyOptional({ enum: ORDENES_USUARIOS, default: 'nombre' })
  @IsOptional()
  @IsIn(ORDENES_USUARIOS, {
    message: `orden debe ser uno de: ${ORDENES_USUARIOS.join(', ')}`,
  })
  orden?: OrdenUsuarios;
}
