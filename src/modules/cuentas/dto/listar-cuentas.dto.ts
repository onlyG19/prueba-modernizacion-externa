import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { NormalizeWhitespace } from '../../../common/decorators/normalize-whitespace.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { USERNAME_MAX_LENGTH } from '../domain/credenciales';

/**
 * Órdenes posibles de la lista: por usuario o por fecha de creación. Con `-`
 * delante, de mayor a menor (`-creadoEn`: las más recientes primero).
 */
export const ORDENES_CUENTAS = [
  'username',
  '-username',
  'creadoEn',
  '-creadoEn',
] as const;
export type OrdenCuentas = (typeof ORDENES_CUENTAS)[number];

/** Parámetros de `GET /cuentas`: paginación, búsqueda y orden. */
export class ListarCuentasDto extends PaginationQueryDto {
  /**
   * Texto a buscar en el usuario (sin distinguir mayúsculas).
   * @example 'maria'
   */
  @IsOptional()
  @NormalizeWhitespace()
  @IsString({ message: 'buscar debe ser texto' })
  @MaxLength(USERNAME_MAX_LENGTH, {
    message: `buscar no puede superar los ${USERNAME_MAX_LENGTH} caracteres`,
  })
  buscar?: string;

  /**
   * Orden de la lista: `username` (por defecto) o `creadoEn`; con `-` delante,
   * descendente.
   * @example '-creadoEn'
   */
  @ApiPropertyOptional({ enum: ORDENES_CUENTAS, default: 'username' })
  @IsOptional()
  @IsIn(ORDENES_CUENTAS, {
    message: `orden debe ser uno de: ${ORDENES_CUENTAS.join(', ')}`,
  })
  orden?: OrdenCuentas;
}
