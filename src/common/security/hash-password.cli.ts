/**
 * Genera el valor de `AUTH_PASSWORD_HASH` para el `.env`.
 *
 * Uso: pnpm auth:hash-password <contraseña>
 *
 * Ojo: la contraseña queda en el historial de la terminal. Si importa, bórrala
 * después o anteponle un espacio al comando (en bash/zsh con HISTCONTROL o
 * HIST_IGNORE_SPACE activo no se guarda).
 */
import { hashPassword } from './password';

const password = process.argv[2];

if (!password) {
  console.error('Uso: pnpm auth:hash-password <contraseña>');
  process.exit(1);
}

hashPassword(password)
  .then((hash) => console.log(hash))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
