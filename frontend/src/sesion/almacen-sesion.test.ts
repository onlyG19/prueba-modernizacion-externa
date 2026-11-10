import { describe, expect, it } from 'vitest';
import {
  borrarSesion,
  guardarSesion,
  leerSesion,
  type Sesion,
} from './almacen-sesion';

const AHORA = 1_000_000;
const CLAVE = 'consola-usuarios:sesion:v2';
const sesion: Sesion = {
  token: 'abc',
  usuario: 'admin',
  rol: 'admin',
  expiraEn: AHORA + 60_000,
};

describe('almacén de sesión', () => {
  it('debe recuperar una sesión vigente', () => {
    guardarSesion(sesion);

    expect(leerSesion(AHORA)).toEqual(sesion);
  });

  it('debe descartar (y borrar) una sesión expirada', () => {
    guardarSesion(sesion);

    expect(leerSesion(sesion.expiraEn)).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it('debe ignorar datos corruptos o con otro formato', () => {
    sessionStorage.setItem(CLAVE, '{no es json');
    expect(leerSesion(AHORA)).toBeNull();

    sessionStorage.setItem(CLAVE, JSON.stringify({ token: 'abc' }));
    expect(leerSesion(AHORA)).toBeNull();
  });

  it('debe ignorar una sesión con un rol desconocido', () => {
    sessionStorage.setItem(CLAVE, JSON.stringify({ ...sesion, rol: 'dios' }));

    expect(leerSesion(AHORA)).toBeNull();
  });

  it.each([
    ['sin versión', 'consola-usuarios:sesion'],
    // La v1 no guardaba el rol: esas sesiones obligan a ingresar de nuevo.
    ['v1, sin rol', 'consola-usuarios:sesion:v1'],
  ])(
    'debe ignorar sesiones guardadas con un formato anterior (%s)',
    (_caso, clave) => {
      const { rol: _rol, ...sinRol } = sesion;
      sessionStorage.setItem(clave, JSON.stringify(sinRol));

      expect(leerSesion(AHORA)).toBeNull();
    },
  );

  it('debe borrar la sesión al cerrar', () => {
    guardarSesion(sesion);
    borrarSesion();

    expect(leerSesion(AHORA)).toBeNull();
  });
});
