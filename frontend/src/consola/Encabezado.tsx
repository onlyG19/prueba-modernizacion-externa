import { Enlace } from '../rutas/Enlace';
import { navegar } from '../rutas/navegacion';
import { RUTAS } from '../rutas/rutas';
import { useSesion, useSesionActiva } from '../sesion/sesion-contexto';
import { BotonSecundario } from '../ui/botones';
import { IconoSalir } from '../ui/iconos';
import { useLogo, type LogoConVisitas } from './consultas-logo';
import estilos from './Encabezado.module.css';

const FORMATO_NUMERO = new Intl.NumberFormat('es-CL');

/** Proporción del logo (lienzo de 645 × 270, sin fondo). */
const ALTO_LOGO = 32;
const ANCHO_LOGO = 76;

function textoVisitas(
  cargando: boolean,
  logo: LogoConVisitas | undefined,
): string {
  if (cargando) {
    return 'Contando visitas…';
  }
  if (logo?.visitas == null) {
    return 'Visitas no disponibles';
  }
  const visitas = logo.visitas;
  // Espacio duro: el número no queda separado de "visitas" al ajustar línea.
  return `${FORMATO_NUMERO.format(visitas)} ${visitas === 1 ? 'visita' : 'visitas'} al logo`;
}

export function Encabezado() {
  const { actions } = useSesion();
  const sesion = useSesionActiva();
  const logo = useLogo();

  function cerrarSesion() {
    actions.cerrarSesion('manual');
    // En el mismo evento: React muestra el login de una vez, sin pasar por
    // la redirección que haría la consola al quedarse sin sesión.
    navegar(RUTAS.ingresar);
  }

  return (
    <header className={estilos.encabezado}>
      <div className={estilos.marca}>
        <Enlace href={RUTAS.panel} className={estilos.enlaceLogo}>
          {logo.data ? (
            <img
              className={estilos.logo}
              src={logo.data.src}
              alt="Uno"
              width={ANCHO_LOGO}
              height={ALTO_LOGO}
            />
          ) : (
            // Reserva el espacio del logo: la página no salta al cargarlo.
            <span className={estilos.reservaLogo}>
              <span className="sr-only">Uno</span>
            </span>
          )}
        </Enlace>
        {/* [ANTES] <h1 className={estilos.titulo}>Registro de usuarios</h1> */}
        {/* Cada página tiene su propio h1: el nombre del producto no es un título. */}
        <p className={estilos.titulo}>Consola de usuarios</p>
      </div>

      <div className={estilos.herramientas}>
        <p className={estilos.visitas}>
          {textoVisitas(logo.isPending, logo.data)}
        </p>
        <p className={estilos.usuario}>
          <span className={estilos.avatar} aria-hidden="true">
            {sesion.usuario.charAt(0).toUpperCase()}
          </span>
          <span className="sr-only">Sesión iniciada como </span>
          <span translate="no">{sesion.usuario}</span>
        </p>
        {/* [ANTES] <BotonSecundario onClick={() => actions.cerrarSesion('manual')}> */}
        <BotonSecundario onClick={cerrarSesion}>
          <IconoSalir />
          Cerrar sesión
        </BotonSecundario>
      </div>
    </header>
  );
}
