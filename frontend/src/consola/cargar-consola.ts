/**
 * Carga el código de la consola. El módulo queda en caché: llamarlo antes
 * (al enfocar el login) lo precarga, y `lazy()` lo reutiliza sin volver a
 * descargarlo.
 */
export const cargarConsola = () => import('./Consola');
