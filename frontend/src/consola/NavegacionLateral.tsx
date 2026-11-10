import { Enlace, EnlaceNav } from '../rutas/Enlace';
import { RUTAS } from '../rutas/rutas';
import { IconoResumen, IconoUsuarios } from '../ui/iconos';
import estilos from './NavegacionLateral.module.css';

/** Las páginas del panel. Para agregar una, basta con sumarla aquí y en `Consola`. */
const PAGINAS = [
  {
    href: RUTAS.panel,
    texto: 'Resumen',
    icono: <IconoResumen />,
    seccion: false,
  },
  {
    href: RUTAS.usuarios,
    texto: 'Usuarios',
    icono: <IconoUsuarios />,
    // "Usuarios" queda marcada también en su pestaña "Registrar usuario".
    seccion: true,
  },
];

export function NavegacionLateral() {
  return (
    <nav aria-label="Panel" className={estilos.lateral}>
      <ul role="list" className={estilos.paginas}>
        {PAGINAS.map((pagina) => (
          <li key={pagina.href}>
            <EnlaceNav
              href={pagina.href}
              seccion={pagina.seccion}
              className={estilos.enlace}
            >
              {pagina.icono}
              {pagina.texto}
            </EnlaceNav>
          </li>
        ))}
      </ul>
      <Enlace href={RUTAS.inicio} className={estilos.sitio}>
        Ver el sitio de inicio
      </Enlace>
    </nav>
  );
}
