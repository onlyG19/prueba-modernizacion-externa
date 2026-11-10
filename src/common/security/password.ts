import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
/** `scrypt` de Node en versión con promesa y tipos explícitos. */
function scryptAsync(
  password: string,
  salt: Buffer,
  keyLength: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

const SALT_BYTES = 16;
const KEY_BYTES = 64;

/** Formato de un hash generado por {@link hashPassword}: `<salt hex>:<clave hex>`. */
export const PASSWORD_HASH_FORMAT = /^[0-9a-f]{32}:[0-9a-f]{128}$/;

/**
 * Deriva un hash de la contraseña con scrypt y una sal aleatoria.
 *
 * @remarks
 * scrypt viene incluido en Node y es deliberadamente costoso en CPU y memoria,
 * lo que encarece los ataques de fuerza bruta. La sal hace que dos contraseñas
 * iguales produzcan hashes distintos.
 *
 * @param password - Contraseña en texto plano.
 * @returns El hash en formato `<salt hex>:<clave hex>`.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scryptAsync(password, salt, KEY_BYTES);
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}

/**
 * Verifica una contraseña contra un hash generado por {@link hashPassword}.
 *
 * @remarks
 * Compara con `timingSafeEqual`, que tarda lo mismo sin importar en qué byte
 * difieran, para no filtrar información por tiempos de respuesta.
 *
 * @param password - Contraseña en texto plano a verificar.
 * @param storedHash - Hash guardado.
 * @returns `true` si coinciden; `false` si no, o si el hash tiene mal formato.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  if (!PASSWORD_HASH_FORMAT.test(storedHash)) {
    return false;
  }
  const [saltHex, keyHex] = storedHash.split(':');
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scryptAsync(
    password,
    Buffer.from(saltHex, 'hex'),
    expected.length,
  );
  return timingSafeEqual(actual, expected);
}
