import { BadRequestException } from '@nestjs/common';
import { createValidationPipe } from '../../../config/validation-pipe';
import { ListarCuentasDto } from './listar-cuentas.dto';

/** El mismo ValidationPipe global de la API (main.ts), sobre la query. */
const pipe = createValidationPipe();

const validar = (valor: unknown) =>
  pipe.transform(valor, {
    type: 'query',
    metatype: ListarCuentasDto,
  }) as Promise<ListarCuentasDto>;

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

describe('ListarCuentasDto', () => {
  it('debe convertir la paginación de la URL (texto) a números, con valores por defecto', async () => {
    await expect(validar({ page: '2' })).resolves.toMatchObject({
      page: 2,
      limit: 20,
    });
  });

  it('debe aceptar los cuatro órdenes', async () => {
    for (const orden of ['username', '-username', 'creadoEn', '-creadoEn']) {
      await expect(validar({ orden })).resolves.toMatchObject({ orden });
    }
  });

  it('debe rechazar un orden que no está en la lista', async () => {
    await expect(mensajesDeError({ orden: 'password_hash' })).resolves.toEqual([
      'orden debe ser uno de: username, -username, creadoEn, -creadoEn',
    ]);
  });

  it('debe rechazar una búsqueda más larga que un usuario', async () => {
    await expect(mensajesDeError({ buscar: 'a'.repeat(31) })).resolves.toEqual([
      'buscar no puede superar los 30 caracteres',
    ]);
  });
});
