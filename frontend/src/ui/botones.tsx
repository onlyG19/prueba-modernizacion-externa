import type { ComponentProps } from 'react';
import estilos from './botones.module.css';
import { clases } from './clases';

type PropsBoton = ComponentProps<'button'>;

/*
 * Variantes explícitas en vez de un `<Boton variante="…">` o props booleanas:
 * el JSX dice exactamente qué se renderiza. Todas son `type="button"` por
 * defecto, para no enviar formularios por accidente; un `type` explícito lo
 * reemplaza.
 */

/** La acción principal de la pantalla o del formulario. */
export function BotonPrimario({ className, ...props }: PropsBoton) {
  return (
    <button
      type="button"
      {...props}
      className={clases(estilos.boton, estilos.primario, className)}
    />
  );
}

/** Acciones de apoyo: cancelar, cerrar sesión. */
export function BotonSecundario({ className, ...props }: PropsBoton) {
  return (
    <button
      type="button"
      {...props}
      className={clases(estilos.boton, estilos.secundario, className)}
    />
  );
}

/** Acciones destructivas: siempre tras una confirmación. */
export function BotonPeligro({ className, ...props }: PropsBoton) {
  return (
    <button
      type="button"
      {...props}
      className={clases(estilos.boton, estilos.peligro, className)}
    />
  );
}

/** Acciones discretas dentro de una fila o un texto. */
export function BotonEnLinea({ className, ...props }: PropsBoton) {
  return (
    <button
      type="button"
      {...props}
      className={clases(estilos.boton, estilos.enLinea, className)}
    />
  );
}
