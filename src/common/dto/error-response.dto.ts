import { ApiProperty } from '@nestjs/swagger';

/** Forma de las respuestas de error de la API (formato por defecto de Nest). */
export class ErrorResponseDto {
  /**
   * Código de estado HTTP.
   * @example 404
   */
  statusCode: number;

  /** Mensaje del error, o la lista de errores de validación (400). */
  @ApiProperty({
    oneOf: [
      { type: 'string', example: 'Usuario con id 99 no encontrado' },
      {
        type: 'array',
        items: { type: 'string' },
        example: ['rut debe ser un RUT válido (ej: 12.345.678-5)'],
      },
    ],
  })
  message: string | string[];

  /**
   * Nombre del estado HTTP.
   * @example 'Not Found'
   */
  error: string;
}
