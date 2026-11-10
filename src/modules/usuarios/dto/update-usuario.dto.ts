// [ANTES] import { PartialType } from '@nestjs/mapped-types';
// PartialType de @nestjs/swagger: además de validación y transformaciones,
// hereda la documentación OpenAPI (con el de mapped-types el esquema quedaba vacío).
import { PartialType } from '@nestjs/swagger';
import { CreateUsuarioDto } from './create-usuario.dto';

export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) {}
