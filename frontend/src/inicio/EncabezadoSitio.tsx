import { urlApi } from '../api/cliente';
import { Enlace } from '../rutas/Enlace';
import { RUTAS } from '../rutas/rutas';
import { useSesion } from '../sesion/sesion-contexto';
import { aspectoBoton } from '../ui/aspecto-boton';
import { clases } from '../ui/clases';
import { IconoResumen, IconoUsuario } from '../ui/iconos';
import estilos from './EncabezadoSitio.module.css';

/** Secciones del sitio de inicio: anclas, así funcionan desde cualquier página. */
const SECCIONES = [
  { href: '/#como-funciona', texto: 'Cómo funciona' },
  { href: '/#por-que', texto: 'Por qué usarla' },
  { href: '/#ayuda', texto: 'Ayuda' },
];

/** Encabezado de las páginas públicas: logo, secciones y acceso a la consola. */
export function EncabezadoSitio() {
  const { state } = useSesion();

  return (
    <header className={estilos.encabezado}>
      <div className={estilos.barra}>
        <Enlace href={RUTAS.inicio} className={estilos.marca}>
          <img
            className={estilos.logo}
            src={urlApi('/logo')}
            alt="Uno, ir al inicio"
            width={115}
            height={48}
            fetchPriority="high"
          />
        </Enlace>

        <nav aria-label="Secciones" className={estilos.navegacion}>
          <ul role="list" className={estilos.secciones}>
            {SECCIONES.map((seccion) => (
              <li key={seccion.href}>
                <a href={seccion.href} className={estilos.enlace}>
                  {seccion.texto}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {state.sesion ? (
          <Enlace
            href={RUTAS.panel}
            className={clases(aspectoBoton.primario, estilos.acceso)}
          >
            <IconoResumen />
            Ir al panel
          </Enlace>
        ) : (
          <Enlace
            href={RUTAS.ingresar}
            className={clases(aspectoBoton.primario, estilos.acceso)}
          >
            <IconoUsuario />
            Ingresar
          </Enlace>
        )}
      </div>
    </header>
  );
}
