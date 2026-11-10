import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { OrdenUsuarios, Usuario } from '../api/tipos';
import { Enlace } from '../rutas/Enlace';
import { RUTAS } from '../rutas/rutas';
import { BotonSecundario } from '../ui/botones';
import { clases } from '../ui/clases';
import { IconoBuscar } from '../ui/iconos';
import { useValorConRetraso } from '../ui/useValorConRetraso';
import { useUsuarios } from './consultas';
import * as FilaUsuario from './FilaUsuario';
import estilos from './ListaUsuarios.module.css';
import { Paginacion } from './Paginacion';

const FORMATO_NUMERO = new Intl.NumberFormat('es-CL');
/** Parámetros de la URL: un enlace o una recarga conservan búsqueda y página. */
const PARAMETRO_BUSQUEDA = 'buscar';
const PARAMETRO_PAGINA = 'pagina';
const PARAMETRO_ORDEN = 'orden';

/** Opciones de orden, con la frase que completa «ordenados por…». */
const ORDENES: ReadonlyArray<{
  valor: OrdenUsuarios;
  etiqueta: string;
  descripcion: string;
}> = [
  {
    valor: 'nombre',
    etiqueta: 'Nombre (A–Z)',
    descripcion: 'nombre, de la A a la Z',
  },
  {
    valor: '-nombre',
    etiqueta: 'Nombre (Z–A)',
    descripcion: 'nombre, de la Z a la A',
  },
  {
    valor: '-creadoEn',
    etiqueta: 'Más recientes',
    descripcion: 'fecha de registro, de los más recientes a los más antiguos',
  },
  {
    valor: 'creadoEn',
    etiqueta: 'Más antiguos',
    descripcion: 'fecha de registro, de los más antiguos a los más recientes',
  },
];
const ORDEN_POR_DEFECTO = ORDENES[0];
/** Pausa tras la última tecla antes de preguntarle al servidor. */
const RETRASO_BUSQUEDA_MS = 300;

/** Con espacio duro: el número nunca queda separado de su palabra. */
const contar = (n: number) =>
  `${FORMATO_NUMERO.format(n)} ${n === 1 ? 'usuario' : 'usuarios'}`;

const contarEncontrados = (n: number) =>
  `${contar(n)} ${n === 1 ? 'encontrado' : 'encontrados'}`;

function leerBusquedaDeUrl(): string {
  return (
    new URLSearchParams(window.location.search).get(PARAMETRO_BUSQUEDA) ?? ''
  );
}

/** La página de la URL; si falta o no es un entero positivo, la primera. */
function leerPaginaDeUrl(): number {
  const pagina = Number(
    new URLSearchParams(window.location.search).get(PARAMETRO_PAGINA),
  );
  return Number.isSafeInteger(pagina) && pagina > 0 ? pagina : 1;
}

/** El orden de la URL; si falta o no es uno conocido, por nombre. */
function leerOrdenDeUrl(): OrdenUsuarios {
  const valor = new URLSearchParams(window.location.search).get(
    PARAMETRO_ORDEN,
  );
  return (ORDENES.find((o) => o.valor === valor) ?? ORDEN_POR_DEFECTO).valor;
}

/** Los valores por defecto (sin búsqueda, primera página) no ensucian la URL. */
function escribirFiltroEnUrl(
  busqueda: string,
  pagina: number,
  orden: OrdenUsuarios,
) {
  const url = new URL(window.location.href);
  if (busqueda.trim()) {
    url.searchParams.set(PARAMETRO_BUSQUEDA, busqueda.trim());
  } else {
    url.searchParams.delete(PARAMETRO_BUSQUEDA);
  }
  if (pagina > 1) {
    url.searchParams.set(PARAMETRO_PAGINA, String(pagina));
  } else {
    url.searchParams.delete(PARAMETRO_PAGINA);
  }
  if (orden !== ORDEN_POR_DEFECTO.valor) {
    url.searchParams.set(PARAMETRO_ORDEN, orden);
  } else {
    url.searchParams.delete(PARAMETRO_ORDEN);
  }
  window.history.replaceState(window.history.state, '', url);
}

interface Props {
  /** El usuario abierto en la ventana de detalle: su fila queda marcada. */
  idSeleccionado: Usuario['id'] | null;
  idResaltado: Usuario['id'] | null;
  onVer: (usuario: Usuario) => void;
  onEditar: (usuario: Usuario) => void;
  onEliminado?: (usuario: Usuario) => void;
}

export function ListaUsuarios({
  idSeleccionado,
  idResaltado,
  onVer,
  onEditar,
  onEliminado,
}: Props) {
  const [busqueda, setBusqueda] = useState(leerBusquedaDeUrl);
  const [pagina, setPagina] = useState(leerPaginaDeUrl);
  const [orden, setOrden] = useState(leerOrdenDeUrl);
  // El campo responde de inmediato; al servidor se le pregunta al dejar de
  // escribir, no una vez por tecla.
  const busquedaParaApi = useValorConRetraso(
    busqueda.trim(),
    RETRASO_BUSQUEDA_MS,
  );
  const usuarios = useUsuarios({ pagina, busqueda: busquedaParaApi, orden });
  const refTitulo = useRef<HTMLHeadingElement>(null);

  // El servidor ya filtra, ordena y pagina: se muestra tal cual llega.
  const visibles = usuarios.data?.data ?? [];
  const totalPaginas = usuarios.data?.meta.totalPages ?? 0;
  const ultimaPagina = Math.max(totalPaginas, 1);

  // Página fuera de rango (un enlace viejo, o se eliminó la única fila de la
  // última página): se corrige durante el render, sin esperar a un efecto.
  if (usuarios.data && !usuarios.isPlaceholderData && pagina > ultimaPagina) {
    setPagina(ultimaPagina);
  }

  // La URL es un sistema externo: un efecto la sincroniza venga de donde venga
  // el cambio (escribir, cambiar de página o la corrección de arriba).
  useEffect(() => {
    escribirFiltroEnUrl(busqueda, pagina, orden);
  }, [busqueda, pagina, orden]);

  function cambiarBusqueda(valor: string) {
    setBusqueda(valor);
    // Otra búsqueda, otros resultados: se parte de la primera página.
    setPagina(1);
  }

  function cambiarOrden(valor: OrdenUsuarios) {
    setOrden(valor);
    // Otro orden: la página 3 ya no muestra lo mismo, se vuelve a la primera.
    setPagina(1);
  }

  function manejarEliminado(usuario: Usuario) {
    // La fila desaparece: el foco pasa al título de la lista y no se pierde.
    refTitulo.current?.focus();
    onEliminado?.(usuario);
  }

  const total = usuarios.data?.meta.total ?? 0;
  // La búsqueda que produjo lo que se ve: mientras llega la nueva, la anterior.
  const terminoBuscado = usuarios.data?.busqueda ?? '';
  // Lo que se ve está por cambiar: se escribe o ya se pidió otra página.
  const actualizando =
    usuarios.isPlaceholderData || busqueda.trim() !== busquedaParaApi;

  let conteo: string | null = null;
  if (usuarios.data) {
    conteo = terminoBuscado ? contarEncontrados(total) : contar(total);
  }

  let contenido: ReactNode;
  if (usuarios.isPending) {
    contenido = <p className={estilos.estado}>Cargando usuarios…</p>;
  } else if (usuarios.isError) {
    contenido = (
      <div className={estilos.falla} role="alert">
        <p>
          No se pudo cargar el registro de usuarios. Revisa tu conexión y vuelve
          a intentarlo.
        </p>
        <BotonSecundario onClick={() => void usuarios.refetch()}>
          Reintentar
        </BotonSecundario>
      </div>
    );
  } else if (total === 0 && !terminoBuscado) {
    // El formulario está en otra pestaña: un enlace lleva directo a él.
    contenido = (
      <p className={estilos.estado}>
        Todavía no hay usuarios registrados.{' '}
        <Enlace href={RUTAS.registrarUsuario} className={estilos.enlace}>
          Registra el primero
        </Enlace>
        .
      </p>
    );
  } else if (total === 0) {
    contenido = (
      <p className={estilos.estado}>
        Ningún usuario coincide con «{terminoBuscado}».
      </p>
    );
  } else if (visibles.length === 0) {
    // Página fuera de rango: la corrección de arriba ya pidió la última.
    contenido = <p className={estilos.estado}>Cargando usuarios…</p>;
  } else {
    contenido = (
      <>
        <table className={estilos.tabla}>
          <caption className="sr-only">
            Usuarios registrados, ordenados por{' '}
            {
              (ORDENES.find((o) => o.valor === orden) ?? ORDEN_POR_DEFECTO)
                .descripcion
            }
          </caption>
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">RUT</th>
              <th scope="col">Registrado</th>
              <th scope="col" className={estilos.columnaAcciones}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((usuario) => (
              <FilaUsuario.Normal
                key={usuario.id}
                usuario={usuario}
                resaltada={usuario.id === idResaltado}
                seleccionada={usuario.id === idSeleccionado}
                onVer={onVer}
                onEditar={onEditar}
                onEliminado={manejarEliminado}
              />
            ))}
          </tbody>
        </table>
        <Paginacion
          pagina={pagina}
          totalPaginas={totalPaginas}
          onCambiar={setPagina}
        />
      </>
    );
  }

  return (
    <section className={estilos.lista} aria-labelledby="titulo-usuarios">
      <div className={estilos.cabecera}>
        <h2
          id="titulo-usuarios"
          ref={refTitulo}
          tabIndex={-1}
          className={estilos.titulo}
        >
          Usuarios registrados
        </h2>
        <p className={estilos.conteo} role="status">
          {conteo}
        </p>
      </div>

      {/* Búsqueda y orden en una fila; en pantallas angostas, apilados. */}
      <div className={estilos.controles}>
        <div className={estilos.busqueda}>
          <label htmlFor="buscar-usuarios" className={estilos.etiqueta}>
            Buscar por nombre o RUT
          </label>
          <div className={estilos.controlBusqueda}>
            <IconoBuscar />
            <input
              id="buscar-usuarios"
              name="buscar"
              type="search"
              className={estilos.entrada}
              value={busqueda}
              onChange={(evento) => cambiarBusqueda(evento.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        <div className={estilos.orden}>
          <label htmlFor="orden-usuarios" className={estilos.etiqueta}>
            Ordenar por
          </label>
          <select
            id="orden-usuarios"
            name="orden"
            className={estilos.selector}
            value={orden}
            onChange={(evento) =>
              cambiarOrden(evento.target.value as OrdenUsuarios)
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
