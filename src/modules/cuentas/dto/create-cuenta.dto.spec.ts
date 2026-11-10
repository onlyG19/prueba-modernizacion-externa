import { BadRequestException } from '@nestjs/common';
import { createValidationPipe } from '../../../config/validation-pipe';
import { CreateCuentaDto } from './create-cuenta.dto';

/** El mismo ValidationPipe global de la API (main.ts). */
const pipe = createValidationPipe();

const validar = (valor: unknown) =>
  pipe.transform(valor, {
    type: 'body',
    metatype: CreateCuentaDto,
  }) as Promise<CreateCuentaDto>;

/** Los mensajes del 400; falla si la validación pasó. */
async function mensajesDeError(valor: unknown): Promise<string[]> {
  try {
    await validar(valor);
  } catch (error) {
    if (error instanceof BadRequestException) {
      return (error.getResponse() as { message: string[] }).message;
    }
    throw error;
  }
  throw new Error('Se esperaba un 400 y la validación pasó');
}

const CLAVE_VALIDA = 'una frase larga y secreta';

describe('CreateCuentaDto', () => {
  it('debe guardar el usuario sin espacios en los extremos y en minúsculas', async () => {
    const dto = await validar({
      username: '  Maria.Lopez ',
      password: CLAVE_VALIDA,
    });

    expect(dto.username).toBe('maria.lopez');
  });

  it('no debe tocar la contraseña: los espacios también cuentan', async () => {
    const dto = await validar({
      username: 'maria',
      password: `  ${CLAVE_VALIDA}  `,
    });

    expect(dto.password).toBe(`  ${CLAVE_VALIDA}  `);
  });

  it.each([
    ['muy corto', 'ab', 'entre 3 y 30 caracteres'],
    ['muy largo', 'a'.repeat(31), 'entre 3 y 30 caracteres'],
    ['con espacios', 'maria lopez', 'solo puede tener letras'],
    ['con tildes', 'maría', 'solo puede tener letras'],
    ['con símbolos', 'maria@uno', 'solo puede tener letras'],
  ])('debe rechazar un usuario %s', async (_caso, username, mensaje) => {
    const mensajes = await mensajesDeError({
      username,
      password: CLAVE_VALIDA,
    });

    expect(mensajes).toEqual([expect.stringContaining(mensaje)]);
  });

  it.each([
    ['de 11 caracteres', 'x'.repeat(11)],
    ['de 129 caracteres', 'x'.repeat(129)],
  ])('debe rechazar una contraseña %s', async (_caso, password) => {
    const mensajes = await mensajesDeError({ username: 'maria', password });

    expect(mensajes).toEqual([
      'La contraseña debe tener entre 12 y 128 caracteres',
    ]);
  });

  it('debe rechazar campos que no son del DTO (p. ej. intentar fijar un rol)', async () => {
    const mensajes = await mensajesDeError({
      username: 'maria',
      password: CLAVE_VALIDA,
      rol: 'admin',
    });

    expect(mensajes).toEqual(['property rol should not exist']);
  });
});
