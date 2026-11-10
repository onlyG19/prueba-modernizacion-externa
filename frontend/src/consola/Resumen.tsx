import type { ReactNode } from 'react';
import { Enlace } from '../rutas/Enlace';
import { RUTAS } from '../rutas/rutas';
import { useSesionActiva } from '../sesion/sesion-contexto';
import { clases } from '../ui/clases';
import { IconoAgregarUsuario, IconoTabla } from '../ui/iconos';
import { useUsuarios } from '../usuarios/consultas';
import { formatearFecha } from '../ui/fechas';
import { formatearRutParcial } from '../usuarios/rut/formato-rut';
import { useLogo } from './consultas-logo';
import estilos from './Resumen.module.css';

const FORMATO_NUMERO = new Intl.NumberFormat('es-CL');
const CUANTOS_RECIENTES = 5;

/** Las páginas del panel, con lo que se hace en cada una. */
const ACCESOS: Array<{
  href: string;
  titulo: string;
  texto: string;
  icono: ReactNode;
}> = [
  {
    href: RUTAS.usuarios,
    titulo: 'Tabla de usuarios',
    texto: 'Busca, ordena y abre el detalle de cada persona.',
    icono: <IconoTabla tamano={22} />,
  },
  {
    href: RUTAS.registrarUsuario,
    titulo: 'Registrar usuario',
    texto: 'Agrega a una persona con su nombre y su RUT.',
    icono: <IconoAgregarUsuario tamano={22} />,
  },
];

/** Portada del panel: cifras del registro, accesos y los últimos registrados. */
export function Resumen() {
  const sesion = useSesionActiva();
  // La primera página ordenada por fecha trae, de una vez, el total y los
  // últimos registrados.
  const recientes = useUsuarios({
    pagina: 1,
    busqueda: '',
    orden: '-creadoEn',
  });
  const logo = useLogo();

  const total = recientes.data?.meta.total;
  const ultimos = recientes.data?.data.slice(0, CUANTOS_RECIENTES) ?? [];

  let visitas = 'Contando…';
  if (!logo.isPending) {
    visitas =
      logo.data?.visitas == null
        ? 'Sin datos'
        : FORMATO_NUMERO.format(logo.data.visitas);
  }

  return (
    <div className={estilos.resumen}>
      <title>Resumen – Consola de usuarios</title>
      <div className={estilos.cabecera}>
        <h1 tabIndex={-1} className={estilos.titulo}>
          Resumen
        </h1>
        <p className={estilos.saludo}>
          Hola, <span translate="no">{sesion.usuario}</span>. Esto es lo
          principal del registro de usuarios.
        </p>
      </div>

      <ul role="list" className={estilos.cifras}>
        <li className={estilos.cifra}>
          <p className={estilos.etiquetaCifra}>Usuarios registrados</p>
          <p className={estilos.valorCifra}>
            {total === undefined ? '…' : FORMATO_NUMERO.format(total)}
          </p>
        </li>
        <li className={estilos.cifra}>
          <p className={estilos.etiquetaCifra}>Visitas al logo</p>
          <p className={estilos.valorCifra}>{visitas}</p>
        </li>
        <li className={estilos.cifra}>
          <p className={estilos.etiquetaCifra}>Último registro</p>
          <p className={clases(estilos.valorCifra, estilos.valorTexto)}>
            {ultimos[0] ? ultimos[0].nombre : '—'}
          </p>
          {ultimos[0] ? (
            <p className={estilos.notaCifra}>
              {formatearFecha(ultimos[0].creadoEn)}
            </p>
          ) : null}
        </li>
      </ul>

      <div className={estilos.columnas}>
        <section className={estilos.panel} aria-labelledby="titulo-recientes">
          <div className={estilos.cabeceraPanel}>
            <h2 id="titulo-recientes" className={estilos.tituloPanel}>
              Registrados recientemente
            </h2>
            <Enlace href={RUTAS.usuarios} className={estilos.verTodos}>
              Ver todos
            </Enlace>
          </div>
          {recientes.isPending ? (
            <p className={estilos.estado}>Cargando usuarios…</p>
          ) : recientes.isError ? (
            <p className={estilos.estado} role="alert">
              No se pudieron cargar los usuarios recientes.
            </p>
          ) : ultimos.length === 0 ? (
            <p className={estilos.estado}>
              Todavía no hay usuarios.{' '}
              <Enlace href={RUTAS.registrarUsuario}>Registra el primero</Enlace>
              .
            </p>
          ) : (
            <ul role="list" className={estilos.recientes}>
              {ultimos.map((usuario) => (
                <li key={usuario.id} className={estilos.reciente}>
                  <span className={estilos.inicial} aria-hidden="true">
                    {usuario.nombre.charAt(0)}
                  </span>
                  <span className={estilos.nombreReciente}>
                    {usuario.nombre}
                  </span>
                  <span className="cifras" translate="no">
                    {formatearRutParcial(usuario.rut)}
                  </span>
                  <span className={estilos.fechaReciente}>
                    {formatearFecha(usuario.creadoEn)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="titulo-accesos">
          <h2 id="titulo-accesos" className={estilos.tituloPanel}>
            Ir a
          </h2>
          <ul role="list" className={estilos.accesos}>
            {ACCESOS.map((acceso) => (
              <li key={acceso.href} className={estilos.acceso}>
                <span className={estilos.iconoAcceso}>{acceso.icono}</span>
                <div>
                  <Enlace href={acceso.href} className={estilos.enlaceAcceso}>
                    {acceso.titulo}
                  </Enlace>
                  <p className={estilos.textoAcceso}>{acceso.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
