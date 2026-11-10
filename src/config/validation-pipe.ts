import { ValidationPipe } from '@nestjs/common';

/**
 * El `ValidationPipe` global de la API (ver `main.ts`), definido en un solo
 * lugar para que los tests validen con exactamente la misma configuración.
 *
 * @remarks Sin `enableImplicitConversion`: convertir según el tipo de
 * TypeScript aceptaba `{"nombre": 123}` como `"123"` y convertía `"false"` en
 * `true`. Lo que deba convertirse (p. ej. `?page=2`) lo declara su DTO con
 * `@Type`.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true, // elimina propiedades no declaradas en el DTO
    forbidNonWhitelisted: true, // lanza error si llegan propiedades extra
    transform: true, // entrega instancias del DTO, con sus @Transform y @Type aplicados
  });
}
