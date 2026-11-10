import { Enlace } from '../rutas/Enlace';
import { RUTAS } from '../rutas/rutas';
import { aspectoBoton } from '../ui/aspecto-boton';
import { EncabezadoSitio } from './EncabezadoSitio';
import estilos from './PaginaNoEncontrada.module.css';

export function PaginaNoEncontrada() {
  return (
    <div className={estilos.pagina}>
      <title>Página no encontrada – Consola de usuarios</title>
      <EncabezadoSitio />
      <main className={estilos.contenido}>
        <p className={estilos.codigo} aria-hidden="true">
          404
        </p>
        <h1 className={estilos.titulo}>No encontramos esta página</h1>
        <p className={estilos.texto}>
          Puede que el enlace esté incompleto o que la página ya no exista.
        </p>
        <Enlace href={RUTAS.inicio} className={aspectoBoton.primario}>
          Ir al inicio
        </Enlace>
      </main>
    </div>
  );
}
