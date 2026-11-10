import { ANY_ORIGIN, parseCorsOrigins, validateCorsOrigins } from './cors';

describe('parseCorsOrigins', () => {
  it('debe devolver el comodín tal cual', () => {
    expect(parseCorsOrigins('*')).toBe(ANY_ORIGIN);
  });

  it('debe separar por comas y quitar espacios y elementos vacíos', () => {
    expect(
      parseCorsOrigins(' https://app.ejemplo.cl , http://localhost:5173,, '),
    ).toEqual(['https://app.ejemplo.cl', 'http://localhost:5173']);
  });

  it('debe devolver el comodín si aparece dentro de una lista', () => {
    expect(parseCorsOrigins('https://app.ejemplo.cl,*')).toBe(ANY_ORIGIN);
  });
});

describe('validateCorsOrigins', () => {
  it('debe aceptar "*" fuera de producción', () => {
    expect(validateCorsOrigins('*', false)).toEqual([]);
  });

  it('debe rechazar "*" en producción', () => {
    expect(validateCorsOrigins('*', true)).toEqual([
      expect.stringContaining('no puede ser "*" en producción'),
    ]);
  });

  it('debe aceptar una lista de orígenes bien formados en producción', () => {
    expect(
      validateCorsOrigins('https://app.ejemplo.cl,http://localhost:5173', true),
    ).toEqual([]);
  });

  it.each([
    ['http://localhost:5173/', 'barra final'],
    ['localhost:5173', 'sin esquema'],
    ['https://app.ejemplo.cl/ruta', 'con ruta'],
    ['ftp://app.ejemplo.cl', 'esquema no web'],
  ])('debe rechazar "%s" (%s)', (origen) => {
    expect(validateCorsOrigins(origen, false)).toEqual([
      expect.stringContaining(`origen inválido: "${origen}"`),
    ]);
  });

  it('debe exigir al menos un origen', () => {
    expect(validateCorsOrigins(' , ', true)).toEqual([
      'CORS_ORIGIN debe tener al menos un origen',
    ]);
  });
});
