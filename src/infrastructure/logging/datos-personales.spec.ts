import type { SerializedRequest } from 'pino';
import {
  enmascararRuts,
  OCULTO,
  RUT_OCULTO,
  serializarPeticion,
} from './datos-personales';

function peticion(parcial: Partial<SerializedRequest>): SerializedRequest {
  return {
    id: 'abc',
    method: 'GET',
    url: '/',
    query: {},
    params: {},
    headers: {},
    remoteAddress: '127.0.0.1',
    remotePort: 1234,
    ...parcial,
  } as SerializedRequest;
}

describe('enmascararRuts', () => {
  it.each([
    ['12.345.678-5'],
    ['12345678-5'],
    ['123456785'],
    ['9.876.543-3'],
    ['10.000.013-K'],
    ['10000013k'],
  ])('debe ocultar el RUT %s', (rut) => {
    expect(enmascararRuts(`/usuarios/${rut}`)).toBe(`/usuarios/${RUT_OCULTO}`);
  });

  it.each([
    ['/usuarios/42'],
    ['/api/v1/logo/count'],
    ['page=2&limit=20'],
    // Un UUID con el primer bloque solo de dígitos no es un RUT.
    ['/usuarios/12345678-1234-4abc-8def-123456789012'],
  ])('no debe tocar textos sin RUT: %s', (texto) => {
    expect(enmascararRuts(texto)).toBe(texto);
  });
});

describe('serializarPeticion', () => {
  it('debe ocultar entero el término buscado, que puede ser un nombre o un RUT', () => {
    const limpia = serializarPeticion(
      peticion({
        url: '/api/v1/usuarios?page=1&buscar=juan%20perez&limit=20',
        query: { page: '1', buscar: 'juan perez', limit: '20' },
      }),
    );

    expect(limpia.url).toBe(
      `/api/v1/usuarios?page=1&buscar=${OCULTO}&limit=20`,
    );
    expect(limpia.query).toEqual({ page: '1', buscar: OCULTO, limit: '20' });
  });

  it('debe enmascarar un RUT en la ruta y en los parámetros de ruta', () => {
    const limpia = serializarPeticion(
      peticion({
        url: '/api/v1/usuarios/12345678-5',
        params: {
          splat: ['v1', 'usuarios', '12345678-5'],
        } as unknown as Record<string, string>,
      }),
    );

    expect(limpia.url).toBe(`/api/v1/usuarios/${RUT_OCULTO}`);
    expect(limpia.params).toEqual({ splat: ['v1', 'usuarios', RUT_OCULTO] });
  });

  it('debe dejar intacto el resto de la petición', () => {
    const original = peticion({
      url: '/api/v1/usuarios?page=2',
      query: { page: '2' },
    });

    expect(serializarPeticion(original)).toEqual(original);
  });
});
