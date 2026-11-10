import { interpretarOrden } from './orden';

const COLUMNAS = { nombre: 'u.nombre', creadoEn: 'u.creadoEn' } as const;

describe('interpretarOrden', () => {
  it.each([
    ['nombre', 'u.nombre', 'ASC'],
    ['-nombre', 'u.nombre', 'DESC'],
    ['creadoEn', 'u.creadoEn', 'ASC'],
    ['-creadoEn', 'u.creadoEn', 'DESC'],
  ] as const)('debe traducir %s a %s %s', (orden, columna, direccion) => {
    expect(interpretarOrden(orden, COLUMNAS)).toEqual({ columna, direccion });
  });
});
