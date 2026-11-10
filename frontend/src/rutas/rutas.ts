/** Las rutas de la aplicación: un solo lugar donde cambiarlas. */
export const RUTAS = {
  inicio: '/',
  ingresar: '/ingresar',
  panel: '/panel',
  usuarios: '/panel/usuarios',
  registrarUsuario: '/panel/usuarios/registrar',
  /** Crear cuentas para ingresar a la consola: solo el administrador. */
  cuentas: '/panel/cuentas',
} as const;

/** Parámetro del login con la página a la que volver tras ingresar. */
export const PARAMETRO_VOLVER = 'volver';

/** Rutas que exigen una sesión iniciada: el panel y todo lo que cuelga de él. */
export function esRutaDelPanel(ruta: string): boolean {
  return ruta === RUTAS.panel || ruta.startsWith(`${RUTAS.panel}/`);
}

/**
 * Adónde ir tras ingresar: la página pedida antes del login, o el panel.
 *
 * @remarks Solo se aceptan rutas del panel. Si se aceptara cualquier valor,
 * un enlace como `/ingresar?volver=https://sitio-falso.cl` llevaría a otro
 * sitio justo después de escribir la contraseña (redirección abierta).
 */
export function destinoTrasIngresar(volver: string | null): string {
  return volver !== null && esRutaDelPanel(volver) ? volver : RUTAS.panel;
}

/** El login, recordando la página (con su query) a la que se quería entrar. */
export function rutaIngresarVolviendoA(destino: string): string {
  const parametros = new URLSearchParams({ [PARAMETRO_VOLVER]: destino });
  return `${RUTAS.ingresar}?${parametros}`;
}
