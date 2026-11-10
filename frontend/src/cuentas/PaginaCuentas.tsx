import { useState } from 'react';
import type { Cuenta } from '../api/tipos';
import { CONSERVAR_FOCO } from '../consola/foco';
import { Enlace, EnlaceNav } from '../rutas/Enlace';
import { RUTAS } from '../rutas/rutas';
import { useSesionActiva } from '../sesion/sesion-contexto';
import { IconoCandado, IconoLlave, IconoTabla } from '../ui/iconos';
import estilos from '../ui/pagina-con-pestanas.module.css';
import { CrearCuenta } from './CrearCuenta';
import { ListaCuentas } from './ListaCuentas';
import propios from './PaginaCuentas.module.css';

interface Props {
  seccion: 'tabla' | 'crear';
}

const TITULOS: Record<Props['seccion'], string> = {
  tabla: 'Tabla de cuentas – Consola de usuarios',
  crear: 'Crear cuenta – Consola de usuarios',
};

/**
 * La página de cuentas, con dos pestañas como la de usuarios: la tabla y el
 * formulario para crear una. Cada pestaña es una ruta (ver `PaginaUsuarios`).
 *
 * @remarks Un operador no ve el enlace en la barra lateral, pero puede llegar
 * por la URL: se le explica que la sección es del administrador. Aunque
 * intentara usarla igual, la API le respondería 403.
 */
export function PaginaCuentas({ seccion }: Props) {
  const { rol } = useSesionActiva();
  // Sobrevive al cambio de pestaña: tras crear una cuenta, la tabla la
  // destaca al llegar a ella.
  const [idResaltado, setIdResaltado] = useState<Cuenta['id'] | null>(null);

  return (
    <div className={estilos.pagina}>
      <title>{TITULOS[seccion]}</title>
      <div>
        <h1 tabIndex={-1} className={estilos.titulo}>
          Cuentas
        </h1>
        <p className={estilos.bajada}>
          Quién puede ingresar a la consola, además del administrador.
        </p>
      </div>

      {rol === 'admin' ? (
        <>
          <nav
            aria-label="Secciones de cuentas"
            className={estilos.pestanas}
            {...{ [CONSERVAR_FOCO]: true }}
          >
            <EnlaceNav href={RUTAS.cuentas} className={estilos.pestana}>
              <IconoTabla />
              Tabla de cuentas
            </EnlaceNav>
            <EnlaceNav href={RUTAS.crearCuenta} className={estilos.pestana}>
              <IconoLlave />
              Crear cuenta
            </EnlaceNav>
          </nav>

          {seccion === 'tabla' ? (
            <ListaCuentas idResaltado={idResaltado} />
          ) : (
            <CrearCuenta onCreada={(cuenta) => setIdResaltado(cuenta.id)} />
          )}
        </>
      ) : (
        <SinPermiso />
      )}
    </div>
  );
}

function SinPermiso() {
  return (
    <section
      className={propios.sinPermiso}
      aria-labelledby="titulo-sin-permiso"
    >
      <IconoCandado tamano={28} />
      <div>
        <h2 id="titulo-sin-permiso" className={propios.subtitulo}>
          Esta sección es del administrador
        </h2>
        <p className={propios.nota}>
          Solo el administrador puede ver y crear cuentas: si alguien necesita
          una, pídela a quien administra la consola.
        </p>
        <Enlace href={RUTAS.panel} className={propios.enlace}>
          Ir al resumen
        </Enlace>
      </div>
    </section>
  );
}
