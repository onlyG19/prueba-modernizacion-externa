/** Sesión iniciada: el token y cuándo expira. */
export interface Sesion {
  token: string;
  usuario: string;
  /** Momento de expiración, en milisegundos desde epoch. */
  expiraEn: number;
}

/**
 * Clave versionada: si el formato cambia, se sube la versión y las sesiones
 * guardadas con el formato anterior se ignoran en vez de romper la app.
 *
 * @remarks
 * Se usa `sessionStorage` y no `localStorage`: la sesión sobrevive a recargar
 * la pestaña, pero se borra al cerrarla. Un JWT en almacenamiento del
 * navegador es legible por un script inyectado (XSS); la alternativa robusta
 * sería una cookie `httpOnly`, que requiere cambiar el backend.
 */
const CLAVE = 'consola-usuarios:sesion:v1';

/** Lee la sesión guardada; la descarta si está mal formada o expiró. */
export function leerSesion(ahora: number = Date.now()): Sesion | null {
  try {
    const guardada = sessionStorage.getItem(CLAVE);
    if (!guardada) {
      return null;
    }
    const datos: unknown = JSON.parse(guardada);
    if (!esSesion(datos) || datos.expiraEn <= ahora) {
      sessionStorage.removeItem(CLAVE);
      return null;
    }
    return datos;
  } catch {
    // JSON corrupto o almacenamiento bloqueado (p. ej. modo privado estricto).
    return null;
  }
}

export function guardarSesion(sesion: Sesion): void {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(sesion));
  } catch {
    // Sin almacenamiento disponible la sesión vive solo en memoria.
  }
}

export function borrarSesion(): void {
  try {
    sessionStorage.removeItem(CLAVE);
  } catch {
    // Nada que borrar si el almacenamiento no está disponible.
  }
}

function esSesion(valor: unknown): valor is Sesion {
  if (typeof valor !== 'object' || valor === null) {
    return false;
  }
  const { token, usuario, expiraEn } = valor as Record<string, unknown>;
  return (
    typeof token === 'string' &&
    token.length > 0 &&
    typeof usuario === 'string' &&
    typeof expiraEn === 'number'
  );
}
