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
  return `${FORMATO_NUMERO.format(visitas)}\u00a0${visitas === 1 ? 'visita' : 'visitas'} al logo`;
}

export function Encabezado() {
  const { actions } = useSesion();
  const sesion = useSesionActiva();
  const logo = useLogo();

  return (
    <header className={estilos.encabezado}>
      <div className={estilos.marca}>
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
          <span className={estilos.reservaLogo} aria-hidden="true" />
        )}
        <h1 className={estilos.titulo}>Registro de usuarios</h1>
      </div>

      <div className={estilos.herramientas}>
        <p className={estilos.visitas}>
          {textoVisitas(logo.isPending, logo.data)}
        </p>
        <p className={estilos.usuario}>
          <span className="sr-only">Sesión iniciada como </span>
          <span translate="no">{sesion.usuario}</span>
        </p>
        <BotonSecundario onClick={() => actions.cerrarSesion('manual')}>
          <IconoSalir />
          Cerrar sesión
        </BotonSecundario>
      </div>
    </header>
  );
}
