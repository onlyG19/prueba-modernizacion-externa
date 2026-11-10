import type { ReactNode } from 'react';
import { Enlace } from '../rutas/Enlace';
import { RUTAS } from '../rutas/rutas';
import { useSesion } from '../sesion/sesion-contexto';
import { aspectoBoton } from '../ui/aspecto-boton';
import { clases } from '../ui/clases';
import {
  IconoAgregarUsuario,
  IconoBuscar,
  IconoCandado,
  IconoDocumento,
  IconoEntrar,
  IconoEscudo,
  IconoSincronizar,
  IconoTabla,
  IconoVerificado,
} from '../ui/iconos';
import { EncabezadoSitio } from './EncabezadoSitio';
import {
  IlustracionGestionar,
  IlustracionIngresar,
  IlustracionRegistrar,
} from './ilustraciones';
import { IndicadoresEnVivo } from './IndicadoresEnVivo';
import estilos from './PaginaInicio.module.css';
import { ProbadorRut } from './ProbadorRut';

interface Acceso {
  href: string;
  titulo: string;
  texto: string;
  icono: ReactNode;
  tono: 'magenta' | 'morado';
}

/*
 * Las páginas del panel piden sesión: sin ella, el login recuerda a cuál se
 * quería ir y la abre después de ingresar.
 */
const ACCESOS: Acceso[] = [
  {
    href: RUTAS.ingresar,
    titulo: 'Ingresa a la consola',
    texto: 'Usa tu cuenta de administración para empezar a trabajar.',
    icono: <IconoEntrar tamano={22} />,
    tono: 'magenta',
  },
  {
    href: RUTAS.usuarios,
    titulo: 'Revisa la tabla de usuarios',
    texto: 'Busca por nombre o RUT, ordena y abre el detalle de cada persona.',
    icono: <IconoTabla tamano={22} />,
    tono: 'morado',
  },
  {
    href: RUTAS.registrarUsuario,
    titulo: 'Registra a una persona',
    texto: 'Solo nombre y RUT: los puntos y el guion se agregan solos.',
    icono: <IconoAgregarUsuario tamano={22} />,
    tono: 'morado',
  },
];

const RAZONES = [
  {
    titulo: 'Cada RUT, revisado dos veces',
    texto:
      'El dígito verificador se comprueba mientras escribes y otra vez en el servidor.',
    icono: <IconoVerificado tamano={22} />,
  },
  {
    titulo: 'Nadie pisa los cambios de otro',
    texto:
      'Si alguien editó a la misma persona mientras tanto, te avisamos antes de guardar.',
    icono: <IconoSincronizar tamano={22} />,
  },
  {
    titulo: 'Búsqueda sin tildes',
    texto:
      'Escribe «perez» y encuentra a Pérez; el RUT, con o sin puntos ni guion.',
    icono: <IconoBuscar tamano={22} />,
  },
  {
    titulo: 'Datos personales protegidos',
    texto:
      'Solo entra quien tiene cuenta, y la sesión se cierra sola al expirar.',
    icono: <IconoCandado tamano={22} />,
  },
];

const PASOS = [
  {
    titulo: 'Ingresa',
    texto:
      'Entra con el usuario y la contraseña de administración. Al expirar la sesión, vuelves justo a donde estabas.',
    ilustracion: <IlustracionIngresar />,
  },
  {
    titulo: 'Registra',
    texto:
      'Escribe el nombre y el RUT. Si el dígito verificador no calza, te decimos cuál debería ser.',
    ilustracion: <IlustracionRegistrar />,
  },
  {
    titulo: 'Gestiona',
    texto:
      'Abre el detalle de cualquier persona desde la tabla, edítala con el lápiz o elimínala si ya no corresponde.',
    ilustracion: <IlustracionGestionar />,
  },
];

const AYUDA = [
  {
    titulo: 'Acceso a la consola',
    texto:
      'El acceso es solo para administración. Pide tus credenciales a quien administra el sistema.',
    icono: <IconoCandado tamano={20} />,
  },
  {
    titulo: 'Documentación de la API',
    texto:
      'Cada endpoint está descrito con OpenAPI en /docs, disponible en el entorno de desarrollo.',
    icono: <IconoDocumento tamano={20} />,
  },
  {
    titulo: 'Datos personales',
    texto:
      'El RUT es un dato personal (Ley 19.628): regístralo solo para el fin que corresponde.',
    icono: <IconoEscudo tamano={20} />,
  },
];

/** Calculado al cargar el módulo: el render no lee el reloj. */
const ANIO_ACTUAL = new Date().getFullYear();

/** Sitio público de inicio, con la estructura y la marca de uno.cl. */
export function PaginaInicio() {
  const { state } = useSesion();
  // Con la sesión ya iniciada, la acción principal lleva directo al panel.
  const accionPrincipal = state.sesion
    ? { href: RUTAS.panel, texto: 'Ir al panel' }
    : { href: RUTAS.ingresar, texto: 'Ingresar a la consola' };

  return (
    <div className={estilos.pagina}>
      <title>Consola de usuarios: registro claro y en orden</title>
      <a className="saltar-contenido" href="#contenido">
        Saltar al contenido
      </a>
      <EncabezadoSitio />

      <main id="contenido" tabIndex={-1} className={estilos.principal}>
        <section className={estilos.portada} aria-labelledby="titulo-portada">
          <div className={estilos.portadaInterior}>
            <div className={estilos.tarjetaPortada}>
              <h1 id="titulo-portada" className={estilos.tituloPortada}>
                <span>Tu registro de usuarios,</span>
                <span className={estilos.acento}>claro y en orden</span>
              </h1>
              <p className={estilos.bajadaPortada}>
                Registra personas con su RUT, encuéntralas en segundos y mantén
                sus datos al día desde un solo lugar.
              </p>
              <div className={estilos.accionesPortada}>
                <Enlace
                  href={accionPrincipal.href}
                  className={aspectoBoton.primario}
                >
                  {accionPrincipal.texto}
                </Enlace>
                <a href="#como-funciona" className={estilos.enlaceSuave}>
                  Ver cómo funciona
                </a>
              </div>
            </div>
            <ProbadorRut />
          </div>
        </section>

        <section className={estilos.accesos} aria-labelledby="titulo-accesos">
          <div className={estilos.interior}>
            <h2 id="titulo-accesos" className="sr-only">
              Accesos directos
            </h2>
            <ul role="list" className={estilos.listaAccesos}>
              {ACCESOS.map((acceso) => (
                <li
                  key={acceso.href}
                  className={clases(estilos.acceso, estilos[acceso.tono])}
                >
                  <span className={estilos.iconoAcceso}>{acceso.icono}</span>
                  <h3 className={estilos.tituloAcceso}>
                    <Enlace href={acceso.href} className={estilos.enlaceAcceso}>
                      {acceso.titulo}
                    </Enlace>
                  </h3>
                  <p className={estilos.textoAcceso}>{acceso.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="por-que"
          className={estilos.bandaMorada}
          aria-labelledby="titulo-por-que"
        >
          <div className={clases(estilos.interior, estilos.interiorBanda)}>
            <div className={estilos.textoBanda}>
              <h2 id="titulo-por-que" className={estilos.tituloBanda}>
                ¿Por qué usar la consola?
              </h2>
              <p>
                Un RUT mal escrito hoy es un problema mañana. La consola revisa
                cada dato antes de guardarlo, para que el registro siga siendo
                confiable con el tiempo.
              </p>
              <p>
                También cuida el trabajo en equipo: si dos personas editan al
                mismo usuario,{' '}
                <strong>nadie pisa los cambios del otro sin saberlo</strong>.
              </p>
              <Enlace
                href={accionPrincipal.href}
                className={clases(aspectoBoton.primario, estilos.botonBanda)}
              >
                {accionPrincipal.texto}
              </Enlace>
            </div>
            <ul role="list" className={estilos.razones}>
              {RAZONES.map((razon) => (
                <li key={razon.titulo} className={estilos.razon}>
                  <span className={estilos.iconoRazon}>{razon.icono}</span>
                  <h3 className={estilos.tituloRazon}>{razon.titulo}</h3>
                  <p className={estilos.textoRazon}>{razon.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="como-funciona"
          className={estilos.seccion}
          aria-labelledby="titulo-como-funciona"
        >
          <div className={estilos.interior}>
            <h2 id="titulo-como-funciona" className={estilos.tituloSeccion}>
              Así funciona, <span className={estilos.acento}>en fácil</span>
            </h2>
            <p className={estilos.bajadaSeccion}>
              Tres pasos, sin manuales ni capacitaciones.
            </p>
            <ol role="list" className={estilos.pasos}>
              {PASOS.map((paso, indice) => (
                <li key={paso.titulo} className={estilos.paso}>
                  <div className={estilos.ilustracionPaso} aria-hidden="true">
                    {paso.ilustracion}
                    <span className={estilos.numeroPaso}>{indice + 1}</span>
                  </div>
                  <div className={estilos.cuerpoPaso}>
                    <h3 className={estilos.tituloPaso}>{paso.titulo}</h3>
                    <p>{paso.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className={estilos.seccion}
          aria-labelledby="titulo-indicadores"
        >
          <div className={estilos.interior}>
            <h2 id="titulo-indicadores" className={estilos.tituloSeccion}>
              El sistema, <span className={estilos.acento}>en vivo</span>
            </h2>
            <p className={estilos.bajadaSeccion}>
              Lo que responde la API en este momento.
            </p>
            <IndicadoresEnVivo />
          </div>
        </section>
      </main>

      <footer className={estilos.pie}>
        <section
          id="ayuda"
          className={clases(estilos.interior, estilos.ayuda)}
          aria-labelledby="titulo-ayuda"
        >
          <h2 id="titulo-ayuda" className={estilos.tituloAyuda}>
            ¿Necesitas ayuda? <span>Te orientamos.</span>
          </h2>
          <ul role="list" className={estilos.temasAyuda}>
            {AYUDA.map((tema) => (
              <li key={tema.titulo}>
                <span className={estilos.iconoAyuda}>{tema.icono}</span>
                <h3 className={estilos.tituloTema}>{tema.titulo}</h3>
                <p className={estilos.textoTema}>{tema.texto}</p>
              </li>
            ))}
          </ul>
        </section>
        <div className={estilos.creditos}>
          <p className={estilos.interior}>
            © {ANIO_ACTUAL} Consola de usuarios. Hecha con NestJS, React y
            PostgreSQL.
          </p>
        </div>
      </footer>
    </div>
  );
}
