import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Tope de elementos por página: nadie puede pedir la tabla completa. */
export const LIMITE_POR_PAGINA_MAXIMO = 100;

/** Parámetros de paginación (`?page=&limit=`), reutilizables en cualquier listado. */
export class PaginationQueryDto {
  /**
   * Número de página, desde 1.
   * @example 1
   */
  // El plugin de Swagger marcaría `required` (no hay `?`): tiene valor por defecto.
  @ApiPropertyOptional({ type: 'integer', default: 1 })
  @IsOptional()
  @Type(() => Number)
  // [ANTES] @IsInt()
  // [ANTES] @Min(1)
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser 1 o mayor' })
  page: number = 1;

  /**
   * Elementos por página (máximo 100).
   * @example 20
   */
  @ApiPropertyOptional({ type: 'integer', default: 20 })
  @IsOptional()
  @Type(() => Number)
  // [ANTES] @IsInt()
  // [ANTES] @Min(1)
  // [ANTES] @Max(LIMITE_POR_PAGINA_MAXIMO)
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser 1 o mayor' })
  @Max(LIMITE_POR_PAGINA_MAXIMO, {
    message: `limit no puede ser mayor que ${LIMITE_POR_PAGINA_MAXIMO}`,
  })
  limit: number = 20;
}
