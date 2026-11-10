import type { ReactNode } from 'react';
import type { Cuenta, OrdenCuentas } from '../api/tipos';
import { Enlace } from '../rutas/Enlace';
import { RUTAS } from '../rutas/rutas';
import { BotonSecundario } from '../ui/botones';
import { clases } from '../ui/clases';
import { formatearFechaYHora } from '../ui/fechas';
import { IconoBuscar } from '../ui/iconos';
import estilos from '../ui/listado.module.css';
import { Paginacion } from '../ui/Paginacion';
import { useFiltroEnUrl } from '../ui/useFiltroEnUrl';
import { useCuentas } from './consultas';
import propios from './ListaCuentas.module.css';

const FORMATO_NUMERO = new Intl.NumberFormat('es-CL');

/** Opciones de orden, con la frase que completa «ordenadas por…». */
const ORDENES: ReadonlyArray<{
  valor: OrdenCuentas;
  etiqueta: string;
  descripcion: string;
}> = [
  {
    valor: 'username',
    etiqueta: 'Usuario (A–Z)',
    descripcion: 'usuario, de la A a la Z',
  },
  {
    valor: '-username',
    etiqueta: 'Usuario (Z–A)',
    descripcion: 'usuario, de la Z a la A',
  },
  {
    valor: '-creadoEn',
    etiqueta: 'Más recientes',
    descripcion: 'fecha de creación, de las más recientes a las más antiguas',
  },
  {
    valor: 'creadoEn',
    etiqueta: 'Más antiguas',
    descripcion: 'fecha de creación, de las más antiguas a las más recientes',
  },
];
const ORDEN_POR_DEFECTO = ORDENES[0];
const VALORES_DE_ORDEN = ORDENES.map((opcion) => opcion.valor);

/** Con espacio duro: el número nunca queda separado de su palabra. */
const contar = (n: number) =>
  `${FORMATO_NUMERO.format(n)} ${n === 1 ? 'cuenta' : 'cuentas'}`;

const contarEncontradas = (n: number) =>
  `${contar(n)} ${n === 1 ? 'encontrada' : 'encontradas'}`;

interface Props {
  /** Recién creada en la otra pestaña: su fila se destaca al llegar. */
  idResaltado: Cuenta['id'] | null;
}

/**
 * Las cuentas creadas por el administrador, con búsqueda, orden y páginas en
 * la URL, como la tabla de usuarios. Es de solo lectura.
 */
export function ListaCuentas({ idResaltado }: Props) {
  const {
    busqueda,
    busquedaParaApi,
    pagina,
    orden,
    cambiarBusqueda,
    cambiarOrden,
    cambiarPagina,
  } = useFiltroEnUrl(VALORES_DE_ORDEN, ORDEN_POR_DEFECTO.valor);
  const cuentas = useCuentas({ pagina, busqueda: busquedaParaApi, orden });

  // El servidor ya filtra, ordena y pagina: se muestra tal cual llega.
  const visibles = cuentas.data?.data ?? [];
  const totalPaginas = cuentas.data?.meta.totalPages ?? 0;
  const ultimaPagina = Math.max(totalPaginas, 1);

  // Página fuera de rango (p. ej. un enlace viejo): se corrige en el render.
  if (cuentas.data && !cuentas.isPlaceholderData && pagina > ultimaPagina) {
    cambiarPagina(ultimaPagina);
  }

  const total = cuentas.data?.meta.total ?? 0;
  // La búsqueda que produjo lo que se ve: mientras llega la nueva, la anterior.
  const terminoBuscado = cuentas.data?.busqueda ?? '';
  const actualizando =
    cuentas.isPlaceholderData || busqueda.trim() !== busquedaParaApi;

  let conteo: string | null = null;
  if (cuentas.data) {
    conteo = terminoBuscado ? contarEncontradas(total) : contar(total);
  }

  let contenido: ReactNode;
  if (cuentas.isPending) {
    contenido = <p className={estilos.estado}>Cargando cuentas…</p>;
  } else if (cuentas.isError) {
    contenido = (
      <div className={estilos.falla} role="alert">
        <p>
          No se pudieron cargar las cuentas. Revisa tu conexión y vuelve a
          intentarlo.
        </p>
        <BotonSecundario onClick={() => void cuentas.refetch()}>
          Reintentar
        </BotonSecundario>
      </div>
    );
  } else if (total === 0 && !terminoBuscado) {
    contenido = (
      <p className={estilos.estado}>
        Todavía no hay cuentas: por ahora solo ingresas tú.{' '}
        <Enlace href={RUTAS.crearCuenta} className={estilos.enlace}>
          Crea la primera
        </Enlace>
        .
      </p>
    );
  } else if (total === 0) {
    contenido = (
      <p className={estilos.estado}>
        Ninguna cuenta coincide con «{terminoBuscado}».
      </p>
    );
  } else if (visibles.length === 0) {
    // Página fuera de rango: la corrección de arriba ya pidió la última.
    contenido = <p className={estilos.estado}>Cargando cuentas…</p>;
  } else {
    contenido = (
      <>
        <table className={estilos.tabla}>
          <caption className="sr-only">
            Cuentas para ingresar a la consola, ordenadas por{' '}
            {
              (ORDENES.find((o) => o.valor === orden) ?? ORDEN_POR_DEFECTO)
                .descripcion
            }
          </caption>
          <thead>
            <tr>
              <th scope="col">Usuario</th>
              <th scope="col">Rol</th>
              <th scope="col">Creada</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((cuenta) => (
              <tr
                key={cuenta.id}
                className={clases(
                  propios.fila,
                  cuenta.id === idResaltado && propios.resaltada,
                )}
              >
                <td className={propios.usuario} translate="no">
                  {cuenta.username}
                </td>
                {/* Toda cuenta de la base es de operador; el admin vive en el .env. */}
                <td className={propios.rol}>Operador</td>
                <td className={propios.fecha}>
                  <time dateTime={cuenta.creadoEn}>
                    {formatearFechaYHora(cuenta.creadoEn)}
                  </time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginacion
          etiqueta="Páginas de cuentas"
          pagina={pagina}
          totalPaginas={totalPaginas}
          onCambiar={cambiarPagina}
        />
      </>
    );
  }

  return (
    <section className={estilos.lista} aria-labelledby="titulo-cuentas">
      <div className={estilos.cabecera}>
        <h2 id="titulo-cuentas" className={estilos.titulo}>
          Cuentas creadas
        </h2>
        <p className={estilos.conteo} role="status">
          {conteo}
        </p>
      </div>
      <p className={propios.nota}>
        Tu cuenta de administrador no aparece aquí: se configura en el servidor.
      </p>

      <div className={estilos.controles}>
        <div className={estilos.busqueda}>
          <label htmlFor="buscar-cuentas" className={estilos.etiqueta}>
            Buscar por usuario
          </label>
          <div className={estilos.controlBusqueda}>
            <IconoBuscar />
            <input
              id="buscar-cuentas"
              name="buscar"
              type="search"
              className={estilos.entrada}
              value={busqueda}
              onChange={(evento) => cambiarBusqueda(evento.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
        </div>

        <div className={estilos.orden}>
          <label htmlFor="orden-cuentas" className={estilos.etiqueta}>
            Ordenar por
          </label>
          <select
            id="orden-cuentas"
            name="orden"
            className={estilos.selector}
            value={orden}
            onChange={(evento) =>
              cambiarOrden(evento.target.value as OrdenCuentas)
            }
          >
            {ORDENES.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className={clases(
          estilos.resultados,
          actualizando && estilos.actualizando,
        )}
        aria-busy={actualizando}
      >
        {contenido}
      </div>
    </section>
  );
}
