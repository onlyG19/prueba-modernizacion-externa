import type { components } from './esquema';

// [ANTES] type ErrorRespuesta = components['schemas']['ErrorResponseDto'];
/** Errores de la API: Problem Details (RFC 9457). */
type ErrorRespuesta = components['schemas']['ProblemDetailsDto'];

/** URL base de la API (ver `VITE_API_URL` en env.d.ts). */
// [ANTES] const BASE = import.meta.env.VITE_API_URL ?? '/api';
const BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

/** La API respondió con un código de error (4xx o 5xx). */
export class ApiError extends Error {
  readonly status: number;
  /** Mensajes del backend: las reglas incumplidas de un 400, o el `detail`. */
  readonly mensajes: string[];

  constructor(status: number, mensajes: string[]) {
    super(mensajes[0] ?? `La API respondió con el código ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.mensajes = mensajes;
  }
}

/** No hubo respuesta: servidor detenido, sin red o petición bloqueada. */
export class ErrorDeConexion extends Error {
  constructor() {
    super('No se pudo conectar con el servidor');
    this.name = 'ErrorDeConexion';
  }
}

type Metodo = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface OpcionesSolicitud {
  metodo?: Metodo;
  /** Se envía como JSON. */
  cuerpo?: unknown;
  /** JWT para `Authorization: Bearer`. */
  token?: string;
  signal?: AbortSignal;
}

/**
 * URL absoluta de un recurso de la API.
 *
 * @remarks Se resuelve contra el origen de la página para que funcione igual
 * con una base relativa (`/api/v1`) o absoluta (`https://api.ejemplo.cl/api/v1`).
 */
export function urlApi(ruta: string): string {
  return new URL(`${BASE}${ruta}`, window.location.origin).toString();
}

/**
 * Hace una petición a la API.
 *
 * @throws ApiError Si la API responde con un código de error.
 * @throws ErrorDeConexion Si no hay respuesta.
 */
export async function solicitar(
  ruta: string,
  { metodo = 'GET', cuerpo, token, signal }: OpcionesSolicitud = {},
): Promise<Response> {
  const cabeceras = new Headers();
  if (cuerpo !== undefined) {
    cabeceras.set('Content-Type', 'application/json');
  }
  if (token) {
    cabeceras.set('Authorization', `Bearer ${token}`);
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(urlApi(ruta), {
      method: metodo,
      headers: cabeceras,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal,
    });
  } catch (error) {
    // Una cancelación (p. ej. al desmontar) no es un problema de conexión.
    if (signal?.aborted) {
      throw error;
    }
    throw new ErrorDeConexion();
  }

  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, await leerMensajes(respuesta));
  }
  return respuesta;
}

/** Como {@link solicitar}, pero devuelve el cuerpo JSON ya interpretado. */
export async function solicitarJson<T>(
  ruta: string,
  opciones?: OpcionesSolicitud,
): Promise<T> {
  const respuesta = await solicitar(ruta, opciones);
  return (await respuesta.json()) as T;
}

async function leerMensajes(respuesta: Response): Promise<string[]> {
  try {
    // [ANTES] const { message } = (await respuesta.json()) as Partial<ErrorRespuesta>;
    // [ANTES] if (Array.isArray(message)) {
    // [ANTES]   return message;
    // [ANTES] }
    // [ANTES] if (typeof message === 'string') {
    // [ANTES]   return [message];
    // [ANTES] }
    const { errors, detail } =
      (await respuesta.json()) as Partial<ErrorRespuesta>;
    if (Array.isArray(errors) && errors.length > 0) {
      return errors;
    }
    if (typeof detail === 'string') {
      return [detail];
    }
  } catch {
    // Cuerpo vacío o que no es JSON: no hay mensajes que mostrar.
  }
  return [];
}
