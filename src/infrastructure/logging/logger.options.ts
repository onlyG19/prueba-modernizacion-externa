import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { LevelWithSilent } from 'pino';
import type { Options } from 'pino-http';
import { Environment } from '../../config/env.validation';
import { serializarPeticion } from './datos-personales';

/** Cabecera con el identificador de la petición, de entrada y de salida. */
export const CABECERA_REQUEST_ID = 'X-Request-Id';

/**
 * Un id recibido solo se acepta si es corto y sin caracteres raros: así nadie
 * puede inyectar texto arbitrario en los logs a través de la cabecera.
 */
const REQUEST_ID_VALIDO = /^[\w-]{1,128}$/;

/**
 * El id de la petición: el de la cabecera `X-Request-Id` si viene y es válido
 * (nginx pone uno), o uno nuevo. Se devuelve en la respuesta: quien reporte
 * un error puede citarlo y encontrarlo en los logs.
 */
export function asignarRequestId(
  req: IncomingMessage,
  res: ServerResponse,
): string {
  const recibido = req.headers['x-request-id'];
  const id =
    typeof recibido === 'string' && REQUEST_ID_VALIDO.test(recibido)
      ? recibido
      : randomUUID();
  res.setHeader(CABECERA_REQUEST_ID, id);
  return id;
}

/** 5xx es una falla de la API; 4xx, un error del cliente. */
export function nivelSegunRespuesta(
  _req: IncomingMessage,
  res: ServerResponse,
  error?: Error,
): LevelWithSilent {
  if (error || res.statusCode >= 500) {
    return 'error';
  }
  if (res.statusCode >= 400) {
    return 'warn';
  }
  return 'info';
}

export interface EntornoLog {
  NODE_ENV: Environment;
  LOG_LEVEL?: LevelWithSilent;
}

/**
 * Opciones de pino-http: un JSON por línea y por petición (lo que esperan los
 * agregadores de logs), con el id de la petición en cada línea.
 *
 * @remarks En desarrollo se ve legible con pino-pretty; en los tests, en
 * silencio salvo que `LOG_LEVEL` diga otra cosa.
 */
export function crearOpcionesLog({ NODE_ENV, LOG_LEVEL }: EntornoLog): Options {
  return {
    level: LOG_LEVEL ?? (NODE_ENV === Environment.Test ? 'silent' : 'info'),
    genReqId: asignarRequestId,
    // El token y las cookies nunca llegan a los logs.
    redact: ['req.headers.authorization', 'req.headers.cookie'],
    // Ni datos personales: el término buscado y cualquier RUT en la URL
    // (Ley 19.628 y su reforma, Ley 21.719). Ver datos-personales.ts.
    serializers: { req: serializarPeticion },
    // Docker consulta /health cada pocos segundos: registrarlo sería ruido.
    autoLogging: { ignore: (req) => req.url === '/health' },
    customLogLevel: nivelSegunRespuesta,
    ...(NODE_ENV === Environment.Development && {
      transport: { target: 'pino-pretty', options: { singleLine: true } },
    }),
  };
}
