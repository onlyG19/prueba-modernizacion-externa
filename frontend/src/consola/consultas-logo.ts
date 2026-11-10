import { useQuery } from '@tanstack/react-query';
import { solicitar } from '../api/cliente';

export interface LogoConVisitas {
  /** Imagen como data URL (no hay que liberarla como un object URL). */
  src: string;
  /** Total de visitas, o `null` si el contador (Redis) no está disponible. */
  visitas: number | null;
}

/**
 * El logo y su contador en una sola petición: `GET /logo` devuelve la imagen y
 * el total en el header `X-Request-Count`. Una etiqueta `<img>` no permite
 * leer headers, por eso se descarga con fetch.
 */
export function useLogo() {
  return useQuery({
    queryKey: ['logo'],
    queryFn: ({ signal }) => obtenerLogo(signal),
    // Cada petición cuenta como una visita: se pide una vez por sesión.
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

async function obtenerLogo(signal: AbortSignal): Promise<LogoConVisitas> {
  const respuesta = await solicitar('/logo', { signal });
  const tipo = (respuesta.headers.get('Content-Type') ?? 'image/svg+xml')
    .split(';')[0]
    .trim();
  const visitas = Number.parseInt(
    respuesta.headers.get('X-Request-Count') ?? '',
    10,
  );
  const bytes = new Uint8Array(await respuesta.arrayBuffer());

  return {
    src: `data:${tipo};base64,${aBase64(bytes)}`,
    visitas: Number.isNaN(visitas) ? null : visitas,
  };
}

/** Base64 por bloques: `String.fromCharCode(...bytes)` desborda con imágenes grandes. */
function aBase64(bytes: Uint8Array): string {
  const BLOQUE = 0x8000;
  let binario = '';
  for (let i = 0; i < bytes.length; i += BLOQUE) {
    binario += String.fromCharCode(...bytes.subarray(i, i + BLOQUE));
  }
  return btoa(binario);
}
