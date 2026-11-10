import type { IncomingMessage, ServerResponse } from 'node:http';
import { Environment } from '../../config/env.validation';
import {
  asignarRequestId,
  CABECERA_REQUEST_ID,
  crearOpcionesLog,
  mensajeDePeticion,
  nivelSegunRespuesta,
} from './logger.options';
import { serializarPeticion } from './datos-personales';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function peticion(cabeceras: Record<string, string> = {}) {
  return { headers: cabeceras } as unknown as IncomingMessage;
}

function respuesta(statusCode = 200) {
  return {
    statusCode,
    setHeader: jest.fn(),
  } as unknown as ServerResponse & { setHeader: jest.Mock };
}

describe('asignarRequestId', () => {
  it('debe conservar un X-Request-Id válido (p. ej. el que pone nginx) y devolverlo', () => {
    const res = respuesta();

    const id = asignarRequestId(
      peticion({ 'x-request-id': 'b7e1c2d4f5a6' }),
      res,
    );

    expect(id).toBe('b7e1c2d4f5a6');
    expect(res.setHeader).toHaveBeenCalledWith(CABECERA_REQUEST_ID, id);
  });

  it.each([
    ['falta', {}],
    ['trae caracteres que podrían ensuciar el log', { 'x-request-id': 'a\nb' }],
    ['es demasiado largo', { 'x-request-id': 'x'.repeat(129) }],
  ])('debe generar un UUID nuevo si la cabecera %s', (_caso, cabeceras) => {
    const res = respuesta();

    const id = asignarRequestId(peticion(cabeceras), res);

    expect(id).toMatch(UUID);
    expect(res.setHeader).toHaveBeenCalledWith(CABECERA_REQUEST_ID, id);
  });
});

describe('nivelSegunRespuesta', () => {
  it.each([
    [200, 'info'],
    [404, 'warn'],
    [429, 'warn'],
    [500, 'error'],
  ])('una respuesta %i debe registrarse como %s', (status, nivel) => {
    expect(nivelSegunRespuesta(peticion(), respuesta(status))).toBe(nivel);
  });

  it('un error no controlado debe registrarse como error', () => {
    expect(nivelSegunRespuesta(peticion(), respuesta(200), new Error())).toBe(
      'error',
    );
  });
});

describe('mensajeDePeticion', () => {
  it('debe resumir la petición en una línea, sin datos personales', () => {
    const req = {
      method: 'GET',
      url: '/usuarios',
      originalUrl: '/api/v1/usuarios?buscar=12.345.678-5',
      headers: {},
    } as unknown as IncomingMessage;

    expect(mensajeDePeticion(req, respuesta(200), 3)).toBe(
      'GET /api/v1/usuarios?buscar=[Redacted] → 200 (3 ms)',
    );
  });
});

describe('crearOpcionesLog', () => {
  it('debe registrar desde info por defecto, en JSON y sin el token', () => {
    const opciones = crearOpcionesLog({ NODE_ENV: Environment.Production });

    expect(opciones.level).toBe('info');
    expect(opciones.transport).toBeUndefined();
    expect(opciones.redact).toContain('req.headers.authorization');
    expect(opciones.serializers?.req).toBe(serializarPeticion);
  });

  it('debe callar en los tests, salvo que LOG_LEVEL pida otra cosa', () => {
    expect(crearOpcionesLog({ NODE_ENV: Environment.Test }).level).toBe(
      'silent',
    );
    expect(
      crearOpcionesLog({ NODE_ENV: Environment.Test, LOG_LEVEL: 'debug' })
        .level,
    ).toBe('debug');
  });

  it('debe usar pino-pretty solo en desarrollo', () => {
    const opciones = crearOpcionesLog({ NODE_ENV: Environment.Development });

    expect(opciones.transport).toMatchObject({ target: 'pino-pretty' });
  });
});
