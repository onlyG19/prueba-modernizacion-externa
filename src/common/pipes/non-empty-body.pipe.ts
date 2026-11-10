import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/** Mensaje del 400 cuando el cuerpo no trae ningún campo. */
export const MENSAJE_CUERPO_VACIO = 'Envía al menos un campo para actualizar.';

/**
 * Rechaza con 400 un cuerpo sin ningún campo definido.
 *
 * @remarks
 * Pensado para PATCH: con todos los campos opcionales, `{}` pasaría la
 * validación y respondería 200 sin cambiar nada, escondiendo un error del
 * cliente. Se aplica al parámetro (`@Body(NonEmptyBodyPipe)`), así que corre
 * después del `ValidationPipe` global y recibe el DTO ya validado.
 */
@Injectable()
export class NonEmptyBodyPipe implements PipeTransform {
  transform<T>(value: T): T {
    // Un campo `undefined` cuenta como ausente: las clases ES2022 declaran sus
    // propiedades aunque no lleguen en la petición.
    const tieneAlgunCampo =
      typeof value === 'object' &&
      value !== null &&
      Object.values(value).some((campo) => campo !== undefined);
    if (!tieneAlgunCampo) {
      throw new BadRequestException(MENSAJE_CUERPO_VACIO);
    }
    return value;
  }
}
