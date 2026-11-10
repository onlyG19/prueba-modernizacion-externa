import {
  normalizarUsername,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from '@dominio-cuentas/credenciales';
import { ApiError, ErrorDeConexion } from '../api/cliente';

export interface DatosCuenta {
  username: string;
  password: string;
}

export type CampoCuenta = keyof DatosCuenta;

/** Un mensaje por campo, más los que no son de un campo (`general`). */
export type ErroresCuenta = Partial<Record<CampoCuenta | 'general', string>>;

/**
 * Validación local con las mismas reglas del backend (importadas del dominio
 * compartido): evita un viaje al servidor para errores que se ven aquí.
 */
export function validarCuenta({
  username,
  password,
}: DatosCuenta): ErroresCuenta {
  const errores: ErroresCuenta = {};

  const usuario = normalizarUsername(username);
  if (!usuario) {
    errores.username = 'Escribe el usuario de la cuenta.';
  } else if (
    usuario.length < USERNAME_MIN_LENGTH ||
    usuario.length > USERNAME_MAX_LENGTH
  ) {
    errores.username = `El usuario debe tener entre ${USERNAME_MIN_LENGTH} y ${USERNAME_MAX_LENGTH} caracteres.`;
  } else if (!USERNAME_PATTERN.test(usuario)) {
    errores.username =
      'Usa solo letras sin tildes, números, puntos, guiones o guiones bajos.';
  }

  if (!password) {
    errores.password = 'Escribe una contraseña para la cuenta.';
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errores.password = `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres (lleva ${password.length}).`;
  } else if (password.length > PASSWORD_MAX_LENGTH) {
    errores.password = `La contraseña puede tener hasta ${PASSWORD_MAX_LENGTH} caracteres.`;
  }

  return errores;
}

/**
 * Traduce un error del servidor al campo donde se puede corregir.
 *
 * @param usernameIngresado - Para mencionar el usuario en el mensaje de duplicado.
 */
export function erroresDeServidor(
  error: unknown,
  usernameIngresado: string,
): ErroresCuenta {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 409:
        return {
          username: `El usuario ${normalizarUsername(usernameIngresado)} ya está en uso. Elige otro.`,
        };
      case 403:
        return { general: 'Solo el administrador puede crear cuentas.' };
      case 400:
        return clasificarMensajes(error.mensajes);
      case 401:
        // La sesión se cierra de forma global (ver cliente-consultas.ts).
        return {};
      case 429:
        return {
          general:
            'Demasiadas solicitudes seguidas. Espera un momento e inténtalo de nuevo.',
        };
    }
  }
  if (error instanceof ErrorDeConexion) {
    return {
      general:
        'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    };
  }
  return { general: 'No se pudo crear la cuenta. Inténtalo de nuevo.' };
}

/** Asigna cada mensaje de validación del backend a su campo. */
function clasificarMensajes(mensajes: string[]): ErroresCuenta {
  const errores: ErroresCuenta = {};
  for (const mensaje of mensajes) {
    if (/contraseña/i.test(mensaje)) {
      errores.password ??= mensaje;
    } else if (/usuario/i.test(mensaje)) {
      errores.username ??= mensaje;
    } else {
      errores.general ??= mensaje;
    }
  }
  return errores;
}
