import { Transform } from 'class-transformer';

/** Uno o más espacios, tabulaciones o saltos de línea seguidos. */
const ESPACIOS = /\s+/g;

/**
 * Normaliza los espacios de un texto antes de validarlo: quita los de los
 * extremos y deja uno solo donde había varios seguidos (también tabulaciones
 * y saltos de línea). Así `"   "` llega vacío a `@IsNotEmpty` y
 * `"  Ana    Rojas "` se guarda como `"Ana Rojas"`.
 *
 * @remarks Lo que no es texto pasa intacto: lo rechaza el validador de tipo
 * (`@IsString`), no esta transformación.
 */
export function NormalizeWhitespace(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(ESPACIOS, ' ') : value,
  );
}
