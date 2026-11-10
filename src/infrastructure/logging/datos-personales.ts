import type { SerializedRequest } from 'pino';

/** Lo que queda en el log en lugar de un dato personal. */
export const OCULTO = '[Redacted]';
/** Lo que queda en el log en lugar de un RUT. */
export const RUT_OCULTO = '[RUT]';

/**
 * Un RUT con o sin puntos y guion: `12.345.678-5`, `12345678-5`, `123456785`.
 * Exige el dígito verificador para no tapar cualquier número, y no puede
 * estar pegado a letras, puntos o guiones: así un UUID como
 * `12345678-1234-…` no se confunde con un RUT.
 */
const RUT = /(?<![\w.-])\d{1,2}(?:\.?\d{3}){2}-?[\dkK](?![\w.-])/g;

/**
 * Parámetros cuyo valor puede ser un dato personal: `buscar` lleva un nombre
 * o un RUT, completo o a medias. Se ocultan enteros.
 */
const PARAMETROS_SENSIBLES = ['buscar'];

const PARAMETRO_EN_URL = new RegExp(
  `([?&](?:${PARAMETROS_SENSIBLES.join('|')})=)[^&#]*`,
  'g',
);

/** Reemplaza cada RUT del texto por `[RUT]`. */
export function enmascararRuts(texto: string): string {
  return texto.replace(RUT, RUT_OCULTO);
}

/** La URL sin datos personales: `buscar` oculto y cualquier RUT enmascarado. */
export function limpiarUrl(url: string): string {
  return enmascararRuts(url.replace(PARAMETRO_EN_URL, `$1${OCULTO}`));
}

/** Aplica `enmascararRuts` a todo texto dentro de un valor (objetos y listas). */
function enmascararEnValor(valor: unknown): unknown {
  if (typeof valor === 'string') {
    return enmascararRuts(valor);
  }
  if (Array.isArray(valor)) {
    return valor.map(enmascararEnValor);
  }
  if (valor !== null && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor).map(([clave, v]) => [clave, enmascararEnValor(v)]),
    );
  }
  return valor;
}

/**
 * La petición tal como queda en el log, sin datos personales: los parámetros
 * sensibles se ocultan y cualquier RUT en la URL, la query o los parámetros de
 * ruta se enmascara.
 *
 * @remarks Es el serializador `req` de pino-http: recibe la petición ya
 * serializada (id, método, URL, query, params y cabeceras). El cuerpo nunca se
 * registra, y el token y las cookies los redacta `redact`.
 */
export function serializarPeticion(req: SerializedRequest): SerializedRequest {
  const query: Record<string, unknown> = { ...req.query };
  for (const parametro of PARAMETROS_SENSIBLES) {
    if (parametro in query) {
      query[parametro] = OCULTO;
    }
  }
  return {
    ...req,
    url: limpiarUrl(req.url),
    query: enmascararEnValor(query) as SerializedRequest['query'],
    params: enmascararEnValor(req.params) as SerializedRequest['params'],
  };
}
