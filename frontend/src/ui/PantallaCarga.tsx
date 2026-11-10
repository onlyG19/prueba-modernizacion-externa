import estilos from './PantallaCarga.module.css';

/** Mientras se descarga el código de la consola, tras iniciar sesión. */
export function PantallaCarga() {
  return (
    <div className={estilos.pantalla} role="status">
      Cargando la consola…
    </div>
  );
}
