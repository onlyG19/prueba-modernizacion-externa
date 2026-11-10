import { ArgumentMetadata, BadRequestException, Type } from '@nestjs/common';
import { createValidationPipe } from '../../../config/validation-pipe';
import { CreateUsuarioDto } from './create-usuario.dto';
import { ListarUsuariosDto } from './listar-usuarios.dto';
import { UpdateUsuarioDto } from './update-usuario.dto';

/** El mismo ValidationPipe global de la API (main.ts). */
const pipe = createValidationPipe();

function validar<T>(
  metatype: Type<T>,
  valor: unknown,
  type: ArgumentMetadata['type'] = 'body',
): Promise<T> {
  return pipe.transform(valor, { type, metatype }) as Promise<T>;
}

/** Los mensajes del 400; falla si la validación pasó. */
async function mensajesDeError(
  metatype: Type<unknown>,
  valor: unknown,
  type: ArgumentMetadata['type'] = 'body',
): Promise<string[]> {
  try {
    await validar(metatype, valor, type);
  } catch (error) {
    if (error instanceof BadRequestException) {
      return (error.getResponse() as { message: string[] }).message;
    }
    throw error;
  }
  throw new Error('Se esperaba un 400 y la validación pasó');
}

const RUT_VALIDO = '12.345.678-5';

describe('CreateUsuarioDto', () => {
  it('debe normalizar los espacios del nombre y el formato del RUT', async () => {
    const dto = await validar(CreateUsuarioDto, {
      nombre: '  Juan   Pérez ',
      rut: RUT_VALIDO,
    });

    expect(dto).toMatchObject({ nombre: 'Juan Pérez', rut: '12345678-5' });
  });

  it('debe rechazar un nombre de solo espacios', async () => {
    const mensajes = await mensajesDeError(CreateUsuarioDto, {
      nombre: '   ',
      rut: RUT_VALIDO,
    });

    expect(mensajes).toContain('El nombre no puede estar vacío');
  });

  it('debe rechazar un nombre que no es texto, sin convertirlo a texto', async () => {
    const mensajes = await mensajesDeError(CreateUsuarioDto, {
      nombre: 123,
      rut: RUT_VALIDO,
    });

    expect(mensajes).toContain('El nombre debe ser texto');
  });
});

describe('UpdateUsuarioDto', () => {
  it('debe aceptar un solo campo, normalizado', async () => {
    const dto = await validar(UpdateUsuarioDto, { nombre: ' Ana  Rojas ' });

    expect(dto).toMatchObject({ nombre: 'Ana Rojas' });
  });

  it('debe rechazar un campo enviado como null (antes terminaba en un 500)', async () => {
    const mensajes = await mensajesDeError(UpdateUsuarioDto, { nombre: null });

    expect(mensajes).toContain('El nombre debe ser texto');
  });

  it('debe rechazar propiedades que el DTO no declara', async () => {
    const mensajes = await mensajesDeError(UpdateUsuarioDto, { edad: 30 });

    expect(mensajes).toContain('property edad should not exist');
  });
});

describe('ListarUsuariosDto', () => {
  it('debe usar la primera página y 20 por página si no se indican', async () => {
    const dto = await validar(ListarUsuariosDto, {}, 'query');

    expect(dto).toMatchObject({ page: 1, limit: 20 });
  });

  it('debe convertir page y limit, que en la URL llegan como texto', async () => {
    const dto = await validar(
      ListarUsuariosDto,
      { page: '2', limit: '5', buscar: '  juan   perez ' },
      'query',
    );

    expect(dto).toMatchObject({ page: 2, limit: 5, buscar: 'juan perez' });
  });

  it.each([
    [{ page: '0' }, 'page debe ser 1 o mayor'],
    [{ page: 'abc' }, 'page debe ser un número entero'],
    [{ limit: '101' }, 'limit no puede ser mayor que 100'],
    [{ buscar: 'x'.repeat(51) }, 'buscar no puede superar los 50 caracteres'],
  ])('debe rechazar %j', async (query, mensaje) => {
    const mensajes = await mensajesDeError(ListarUsuariosDto, query, 'query');

    expect(mensajes).toContain(mensaje);
  });
});
