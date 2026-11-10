import estilos from './botones.module.css';
import { clases } from './clases';

/**
 * Clases de los botones para un enlace que debe verse como botón. Si lleva a
 * otra página es un enlace (`<a>`), aunque se vea como botón: así se puede
 * abrir en otra pestaña y el lector lo anuncia como lo que es.
 */
export const aspectoBoton = {
  primario: clases(estilos.boton, estilos.primario),
  secundario: clases(estilos.boton, estilos.secundario),
} as const;
