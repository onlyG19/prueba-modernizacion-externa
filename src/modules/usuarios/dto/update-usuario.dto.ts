// PartialType de @nestjs/swagger: además de validación y transformaciones,
// hereda la documentación OpenAPI (con el de mapped-types el esquema quedaba vacío).
import { PartialType } from '@nestjs/swagger';
import { CreateUsuarioDto } from './create-usuario.dto';

/**
 * Todos los campos de `CreateUsuarioDto`, opcionales.
 *
 * @remarks `skipNullProperties: false`: un campo omitido no se valida, pero uno
 * enviado como `null` sí, y se rechaza con 400. Antes `{"nombre": null}` pasaba
 * la validación y Postgres lo frenaba con un 500 (columna NOT NULL). Un cuerpo
 * vacío lo rechaza `NonEmptyBodyPipe` en el controller.
 */
export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto, {
  skipNullProperties: false,
}) {}
