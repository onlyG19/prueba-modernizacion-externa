import { PASSWORD_HASH_FORMAT, hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('debe generar un hash con el formato <salt>:<clave>', async () => {
    expect(await hashPassword('secreta')).toMatch(PASSWORD_HASH_FORMAT);
  });

  it('debe generar hashes distintos para la misma contraseña (sal aleatoria)', async () => {
    expect(await hashPassword('secreta')).not.toBe(
      await hashPassword('secreta'),
    );
  });

  it('debe aceptar la contraseña correcta', async () => {
    const hash = await hashPassword('secreta');

    expect(await verifyPassword('secreta', hash)).toBe(true);
  });

  it('debe rechazar una contraseña incorrecta', async () => {
    const hash = await hashPassword('secreta');

    expect(await verifyPassword('Secreta', hash)).toBe(false);
  });

  it.each([[''], ['no-es-un-hash'], ['abc:def']])(
    'debe rechazar un hash mal formado (%p) sin lanzar',
    async (hashInvalido) => {
      expect(await verifyPassword('secreta', hashInvalido)).toBe(false);
    },
  );
});
