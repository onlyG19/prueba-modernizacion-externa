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
  @IsInt()
  @Min(1)
  page: number = 1;

  /**
   * Elementos por página (máximo 100).
   * @example 20
   */
  @ApiPropertyOptional({ type: 'integer', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIMITE_POR_PAGINA_MAXIMO)
  limit: number = 20;
}
