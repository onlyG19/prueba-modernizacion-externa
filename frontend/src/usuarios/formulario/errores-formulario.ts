import { NOMBRE_MAX_LENGTH } from '@dominio/usuario.constants';
import { ApiError, ErrorDeConexion } from '../../api/cliente';
import { formatearRutParcial, verificarRut } from '../rut/formato-rut';
import type { DatosFormulario, ErroresFormulario } from './formulario-contexto';

/**
 * Validación local, con las mismas reglas del backend (largo del nombre y
 * dígito verificador, ambos importados del dominio compartido). Evita un viaje
 * al servidor para errores que se pueden detectar aquí.
 */
export function validarFormulario({
  nombre,
  rut,
}: DatosFormulario): ErroresFormulario {
  const errores: ErroresFormulario = {};

  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) {
    errores.nombre = 'Escribe el nombre del usuario.';
  } else if (nombreLimpio.length > NOMBRE_MAX_LENGTH) {
    errores.nombre = `El nombre puede tener hasta ${NOMBRE_MAX_LENGTH} caracteres.`;
  }

  const verificacion = verificarRut(rut);
  if (verificacion.estado === 'vacio') {
    errores.rut = 'Escribe el RUT del usuario.';
  } else if (verificacion.estado === 'incompleto') {
    errores.rut = 'Completa el RUT con su dígito verificador.';
  } else if (verificacion.estado === 'invalido') {
    errores.rut = `El dígito verificador no corresponde: para este número debería ser ${verificacion.dvEsperado}.`;
  }

  return errores;
}

/**
 * Traduce un error del servidor al campo donde la persona puede corregirlo.
 *
 * @param rutIngresado - Para mencionar el RUT en el mensaje de duplicado.
 */
export function erroresDeServidor(
  error: unknown,
  rutIngresado: string,
): ErroresFormulario {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 409:
        return {
          rut: `Ya existe un usuario con el RUT ${formatearRutParcial(rutIngresado)}. Revisa el número o búscalo en la lista.`,
        };
      case 404:
        return {
          general:
            'Este usuario ya no existe: puede que otra persona lo haya eliminado. Cancela la edición para seguir.',
        };
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
  return { general: 'No se pudo guardar. Inténtalo de nuevo.' };
}

/** Asigna cada mensaje de validación del backend a su campo. */
function clasificarMensajes(mensajes: string[]): ErroresFormulario {
  const errores: ErroresFormulario = {};
  for (const mensaje of mensajes) {
    if (/rut/i.test(mensaje)) {
      errores.rut ??= mensaje;
    } else if (/nombre/i.test(mensaje)) {
      errores.nombre ??= mensaje;
    } else {
      errores.general ??= mensaje;
    }
  }
  return errores;
}
