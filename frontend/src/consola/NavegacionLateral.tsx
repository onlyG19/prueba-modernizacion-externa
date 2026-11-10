import type { ReactNode } from 'react';
import type { Rol } from '../api/tipos';
import { Enlace, EnlaceNav } from '../rutas/Enlace';
import { RUTAS } from '../rutas/rutas';
import { useSesionActiva } from '../sesion/sesion-contexto';
import { IconoLlave, IconoResumen, IconoUsuarios } from '../ui/iconos';
import estilos from './NavegacionLateral.module.css';

/** Las páginas del panel. Para agregar una, basta con sumarla aquí y en `Consola`. */
const PAGINAS: Array<{
  href: string;
  texto: string;
  icono: ReactNode;
  seccion: boolean;
  /** Si solo la ve un rol; sin valor, la ven todos. */
  soloRol?: Rol;
}> = [
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
  {
    href: RUTAS.cuentas,
    texto: 'Cuentas',
    icono: <IconoLlave />,
    // Queda marcada también en su pestaña "Crear cuenta".
    seccion: true,
    soloRol: 'admin',
  },
];

export function NavegacionLateral() {
  const { rol } = useSesionActiva();
  // Ocultar el enlace es comodidad, no seguridad: la API rechaza con 403 a
  // quien no sea admin aunque llegue a la página por la URL.
  const visibles = PAGINAS.filter(
    (pagina) => pagina.soloRol === undefined || pagina.soloRol === rol,
  );

  return (
    <nav aria-label="Panel" className={estilos.lateral}>
      <ul role="list" className={estilos.paginas}>
        {visibles.map((pagina) => (
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
