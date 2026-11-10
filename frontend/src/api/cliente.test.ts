import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { servidor } from '../test/servidor';
import { ApiError, ErrorDeConexion, solicitar } from './cliente';

const problema = (status: number, cuerpo: Record<string, unknown>) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, instance: '/x', ...cuerpo },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );

/** Ejecuta la petición y devuelve el error que lanzó. */
async function errorDe(ruta: string): Promise<unknown> {
  return solicitar(ruta).then(
    () => null,
    (error: unknown) => error,
  );
}

describe('cliente de la API (Problem Details)', () => {
  it('debe tomar las reglas incumplidas de un 400 desde errors', async () => {
    servidor.use(
      http.get('/api/v1/x', () =>
        problema(400, {
          detail: 'La solicitud tiene datos inválidos.',
          errors: ['rut debe ser un RUT válido (ej: 12.345.678-5)'],
        }),
      ),
    );

    const error = await errorDe('/x');

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      mensajes: ['rut debe ser un RUT válido (ej: 12.345.678-5)'],
    });
  });

  it('debe usar detail cuando no hay lista de errores', async () => {
    servidor.use(
      http.get('/api/v1/x', () =>
        problema(409, { detail: 'Ya existe un usuario con el RUT 1-9' }),
      ),
    );

    expect(await errorDe('/x')).toMatchObject({
      status: 409,
      mensajes: ['Ya existe un usuario con el RUT 1-9'],
    });
  });

  it('debe tolerar un error sin cuerpo JSON', async () => {
    servidor.use(
      http.get(
        '/api/v1/x',
        () => new HttpResponse('Bad Gateway', { status: 502 }),
      ),
    );

    expect(await errorDe('/x')).toMatchObject({ status: 502, mensajes: [] });
  });

  it('debe distinguir la falta de respuesta como ErrorDeConexion', async () => {
    servidor.use(http.get('/api/v1/x', () => HttpResponse.error()));

    expect(await errorDe('/x')).toBeInstanceOf(ErrorDeConexion);
  });
});
