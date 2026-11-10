import { describe, expect, it } from 'vitest';
import { ApiError, ErrorDeConexion } from '../api/cliente';
import { erroresDeServidor, validarCuenta } from './reglas-cuenta';

const CLAVE_VALIDA = 'una frase larga y secreta';

describe('validarCuenta', () => {
  it('debe aceptar un usuario válido escrito con mayúsculas y espacios', () => {
    expect(
      validarCuenta({ username: ' Maria.Lopez ', password: CLAVE_VALIDA }),
    ).toEqual({});
  });

  it.each([
    ['vacío', '   ', 'Escribe el usuario de la cuenta.'],
    ['muy corto', 'ab', 'El usuario debe tener entre 3 y 30 caracteres.'],
    [
      'muy largo',
      'a'.repeat(31),
      'El usuario debe tener entre 3 y 30 caracteres.',
    ],
    [
      'con tildes',
      'maría',
      'Usa solo letras sin tildes, números, puntos, guiones o guiones bajos.',
    ],
    [
      'con espacios al medio',
      'maria lopez',
      'Usa solo letras sin tildes, números, puntos, guiones o guiones bajos.',
    ],
  ])('debe rechazar un usuario %s', (_caso, username, mensaje) => {
    expect(validarCuenta({ username, password: CLAVE_VALIDA }).username).toBe(
      mensaje,
    );
  });

  it.each([
    ['vacía', '', 'Escribe una contraseña para la cuenta.'],
    [
      'de 11 caracteres',
      'x'.repeat(11),
      'La contraseña debe tener al menos 12 caracteres (lleva 11).',
    ],
    [
      'de 129 caracteres',
      'x'.repeat(129),
      'La contraseña puede tener hasta 128 caracteres.',
    ],
  ])('debe rechazar una contraseña %s', (_caso, password, mensaje) => {
    expect(validarCuenta({ username: 'maria', password }).password).toBe(
      mensaje,
    );
  });

  it('debe aceptar una contraseña de exactamente 12 caracteres', () => {
    expect(
      validarCuenta({ username: 'maria', password: 'x'.repeat(12) }),
    ).toEqual({});
  });
});

describe('erroresDeServidor', () => {
  it('debe llevar un 409 al campo de usuario, con el usuario normalizado', () => {
    expect(
      erroresDeServidor(
        new ApiError(409, ['El usuario maria ya está en uso']),
        ' Maria ',
      ),
    ).toEqual({ username: 'El usuario maria ya está en uso. Elige otro.' });
  });

  it('debe repartir los mensajes de un 400 entre sus campos', () => {
    expect(
      erroresDeServidor(
        new ApiError(400, [
          'El usuario solo puede tener letras sin tildes, números, puntos, guiones y guiones bajos',
          'La contraseña debe tener entre 12 y 128 caracteres',
        ]),
        'x',
      ),
    ).toEqual({
      username:
        'El usuario solo puede tener letras sin tildes, números, puntos, guiones y guiones bajos',
      password: 'La contraseña debe tener entre 12 y 128 caracteres',
    });
  });

  it('debe explicar un 403 como un error general', () => {
    expect(erroresDeServidor(new ApiError(403, []), 'x')).toEqual({
      general: 'Solo el administrador puede crear cuentas.',
    });
  });

  it('no debe mostrar nada ante un 401: la sesión se cierra sola', () => {
    expect(erroresDeServidor(new ApiError(401, []), 'x')).toEqual({});
  });

  it('debe avisar si no hay conexión con el servidor', () => {
    expect(erroresDeServidor(new ErrorDeConexion(), 'x').general).toMatch(
      /No se pudo conectar/,
    );
  });
});
