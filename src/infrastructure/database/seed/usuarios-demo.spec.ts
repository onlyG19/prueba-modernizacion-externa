import { Rut } from '../../../modules/usuarios/domain/rut';
import { NOMBRE_MAX_LENGTH } from '../../../modules/usuarios/domain/usuario.constants';
import {
  CANTIDAD_POR_DEFECTO,
  generarUsuariosDemo,
  leerOpcionesSeed,
} from './usuarios-demo';

const HASTA = new Date('2026-11-10T12:00:00.000Z');
const UN_ANIO_MS = 365 * 24 * 60 * 60 * 1000;

describe('generarUsuariosDemo', () => {
  const usuarios = generarUsuariosDemo(200, { hasta: HASTA });

  it('debe generar la cantidad pedida, con RUT válidos, únicos y en forma canónica', () => {
    expect(usuarios).toHaveLength(200);
    for (const { rut } of usuarios) {
      expect(Rut.esValido(rut)).toBe(true);
      expect(rut).toBe(Rut.normalizar(rut));
    }
    expect(new Set(usuarios.map((u) => u.rut)).size).toBe(200);
  });

  it('debe generar nombres completos que caben en la columna', () => {
    for (const { nombre } of usuarios) {
      expect(nombre.split(' ').length).toBeGreaterThanOrEqual(3);
      expect(nombre.length).toBeLessThanOrEqual(NOMBRE_MAX_LENGTH);
    }
  });

  it('debe repartir las fechas de registro en el último año', () => {
    for (const { creadoEn } of usuarios) {
      expect(creadoEn.getTime()).toBeLessThanOrEqual(HASTA.getTime());
      expect(creadoEn.getTime()).toBeGreaterThan(HASTA.getTime() - UN_ANIO_MS);
    }
  });

  it('debe ser determinista: la misma semilla da los mismos usuarios', () => {
    const otraVez = generarUsuariosDemo(200, { hasta: HASTA });
    const otraSemilla = generarUsuariosDemo(200, { hasta: HASTA, semilla: 7 });

    expect(otraVez).toEqual(usuarios);
    expect(otraSemilla.map((u) => u.rut)).not.toEqual(
      usuarios.map((u) => u.rut),
    );
  });
});

describe('leerOpcionesSeed', () => {
  it('debe usar 50 usuarios y sin forzar por defecto', () => {
    expect(leerOpcionesSeed([])).toEqual({
      cantidad: CANTIDAD_POR_DEFECTO,
      forzar: false,
    });
  });

  it('debe leer --cantidad y --forzar', () => {
    expect(leerOpcionesSeed(['--cantidad=120', '--forzar'])).toEqual({
      cantidad: 120,
      forzar: true,
    });
  });

  it.each([['--cantidad=0'], ['--cantidad=1001'], ['--cantidad=abc']])(
    'debe rechazar %s',
    (argumento) => {
      expect(() => leerOpcionesSeed([argumento])).toThrow(/--cantidad/);
    },
  );
});
