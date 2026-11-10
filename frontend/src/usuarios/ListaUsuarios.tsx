import { useRef, type ReactNode } from 'react';
import type { OrdenUsuarios, Usuario } from '../api/tipos';
import { Enlace } from '../rutas/Enlace';
import { RUTAS } from '../rutas/rutas';
import { BotonSecundario } from '../ui/botones';
import { clases } from '../ui/clases';
import { IconoBuscar } from '../ui/iconos';
import estilos from '../ui/listado.module.css';
import { Paginacion } from '../ui/Paginacion';
import { useFiltroEnUrl } from '../ui/useFiltroEnUrl';
import { useUsuarios } from './consultas';
import * as FilaUsuario from './FilaUsuario';

const FORMATO_NUMERO = new Intl.NumberFormat('es-CL');

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
const VALORES_DE_ORDEN = ORDENES.map((opcion) => opcion.valor);

/** Con espacio duro: el número nunca queda separado de su palabra. */
const contar = (n: number) =>
  `${FORMATO_NUMERO.format(n)} ${n === 1 ? 'usuario' : 'usuarios'}`;

const contarEncontrados = (n: number) =>
  `${contar(n)} ${n === 1 ? 'encontrado' : 'encontrados'}`;

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
  const {
    busqueda,
    busquedaParaApi,
    pagina,
    orden,
    cambiarBusqueda,
    cambiarOrden,
    cambiarPagina,
  } = useFiltroEnUrl(VALORES_DE_ORDEN, ORDEN_POR_DEFECTO.valor);
  const usuarios = useUsuarios({ pagina, busqueda: busquedaParaApi, orden });
  const refTitulo = useRef<HTMLHeadingElement>(null);

  // El servidor ya filtra, ordena y pagina: se muestra tal cual llega.
  const visibles = usuarios.data?.data ?? [];
  const totalPaginas = usuarios.data?.meta.totalPages ?? 0;
  const ultimaPagina = Math.max(totalPaginas, 1);

  // Página fuera de rango (un enlace viejo, o se eliminó la única fila de la
  // última página): se corrige durante el render, sin esperar a un efecto.
  if (usuarios.data && !usuarios.isPlaceholderData && pagina > ultimaPagina) {
    cambiarPagina(ultimaPagina);
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
          etiqueta="Páginas de usuarios"
          pagina={pagina}
          totalPaginas={totalPaginas}
          onCambiar={cambiarPagina}
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
