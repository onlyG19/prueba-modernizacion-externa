import { ValidateBy, ValidationOptions, buildMessage } from 'class-validator';
import { Rut } from '../domain/rut';

/** Nombre de la restricción; así aparece como clave en `error.constraints`. */
export const IS_RUT = 'isRut';

/**
 * Indica si un valor es un RUT chileno válido.
 *
 * @param value - Valor a evaluar; puede ser de cualquier tipo.
 * @returns `true` solo si es un string y {@link Rut.esValido} lo acepta.
 */
export function isRut(value: unknown): boolean {
  return typeof value === 'string' && Rut.esValido(value);
}

/**
 * Decorador de class-validator que exige que la propiedad sea un RUT válido
 * (formato del cuerpo y dígito verificador).
 *
 * @param validationOptions - Opciones estándar de class-validator
 *   (por ej. `message` para personalizar el error).
 *
 * @example
 * ```ts
 * class CreateUsuarioDto {
 *   @IsRut()
 *   rut: string;
 * }
 * ```
 */
export function IsRut(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_RUT,
      validator: {
        validate: (value): boolean => isRut(value),
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property debe ser un RUT válido (ej: 12.345.678-5)`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
