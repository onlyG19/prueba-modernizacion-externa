import { describe, expect, it } from 'vitest';
import {
  destinoTrasIngresar,
  esRutaDelPanel,
  RUTAS,
  rutaIngresarVolviendoA,
} from './rutas';

describe('esRutaDelPanel', () => {
  it.each([RUTAS.panel, RUTAS.usuarios, RUTAS.registrarUsuario])(
    'debe considerar %s parte del panel',
    (ruta) => {
      expect(esRutaDelPanel(ruta)).toBe(true);
    },
  );

  it.each(['/', '/ingresar', '/panelito', '/otra/panel'])(
    'no debe considerar %s parte del panel',
    (ruta) => {
      expect(esRutaDelPanel(ruta)).toBe(false);
    },
  );
});

describe('destinoTrasIngresar', () => {
  it('debe volver a la página del panel pedida, con su búsqueda', () => {
    expect(destinoTrasIngresar('/panel/usuarios?buscar=ana')).toBe(
      '/panel/usuarios?buscar=ana',
    );
  });

  it.each([
    null,
    'https://sitio-falso.cl',
    '//sitio-falso.cl/panel',
    '/ingresar',
    'javascript:alert(1)',
  ])('debe ir al panel si el destino es %s', (volver) => {
    expect(destinoTrasIngresar(volver)).toBe(RUTAS.panel);
  });
});

describe('rutaIngresarVolviendoA', () => {
  it('debe codificar el destino como parámetro del login', () => {
    expect(rutaIngresarVolviendoA('/panel/usuarios?buscar=ana')).toBe(
      '/ingresar?volver=%2Fpanel%2Fusuarios%3Fbuscar%3Dana',
    );
  });
});
