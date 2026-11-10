// [ANTES] import {
// [ANTES]   useDeferredValue,
// [ANTES]   useMemo,
// [ANTES]   useRef,
// [ANTES]   useState,
// [ANTES]   type ReactNode,
// [ANTES] } from 'react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
// [ANTES] import type { Usuario } from '../api/tipos';
import type { OrdenUsuarios, Usuario } from '../api/tipos';
import { BotonSecundario } from '../ui/botones';
import { clases } from '../ui/clases';
import { IconoBuscar } from '../ui/iconos';
import { useValorConRetraso } from '../ui/useValorConRetraso';
import { useUsuarios } from './consultas';
import * as FilaUsuario from './FilaUsuario';
import estilos from './ListaUsuarios.module.css';
import { Paginacion } from './Paginacion';

// [ANTES] /** Creado una vez: ordena en español y sin distinguir tildes. */
// [ANTES] const COLECCION = new Intl.Collator('es', { sensitivity: 'base' });
const FORMATO_NUMERO = new Intl.NumberFormat('es-CL');
// [ANTES] /** Parámetro de la URL con la búsqueda: un enlace o una recarga la conservan. */
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
// [ANTES] const SIN_TILDES = /\p{Diacritic}/gu;
// [ANTES] const SEPARADORES_RUT = /[.\-\s]/g;
// [ANTES]
// [ANTES] const normalizar = (texto: string) =>
// [ANTES]   texto.normalize('NFD').replace(SIN_TILDES, '').toLowerCase();
// [ANTES]
// [ANTES] /** Coincide por nombre (sin tildes) o por RUT (con o sin puntos y guion). */
// [ANTES] function filtrar(usuarios: Usuario[], busqueda: string): Usuario[] {
// [ANTES]   const texto = normalizar(busqueda.trim());
// [ANTES]   if (!texto) {
// [ANTES]     return usuarios;
// [ANTES]   }
// [ANTES]   const rutBuscado = texto.replace(SEPARADORES_RUT, '');
// [ANTES]   return usuarios.filter(
// [ANTES]     (usuario) =>
// [ANTES]       normalizar(usuario.nombre).includes(texto) ||
// [ANTES]       (rutBuscado !== '' &&
// [ANTES]         usuario.rut
// [ANTES]           .replace(SEPARADORES_RUT, '')
// [ANTES]           .toLowerCase()
// [ANTES]           .includes(rutBuscado)),
// [ANTES]   );
// [ANTES] }

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

// [ANTES] function escribirBusquedaEnUrl(busqueda: string) {
// [ANTES]   const url = new URL(window.location.href);
// [ANTES]   if (busqueda.trim()) {
// [ANTES]     url.searchParams.set(PARAMETRO_BUSQUEDA, busqueda.trim());
// [ANTES]   } else {
// [ANTES]     url.searchParams.delete(PARAMETRO_BUSQUEDA);
// [ANTES]   }
// [ANTES]   window.history.replaceState(window.history.state, '', url);
// [ANTES] }
/** Los valores por defecto (sin búsqueda, primera página) no ensucian la URL. */
// [ANTES] function escribirFiltroEnUrl(busqueda: string, pagina: number) {
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
  // [ANTES] idEnEdicion: number | null;
  idEnEdicion: Usuario['id'] | null;
  // [ANTES] idResaltado: number | null;
  idResaltado: Usuario['id'] | null;
  onEditar: (usuario: Usuario) => void;
  onEliminado: (usuario: Usuario) => void;
}

export function ListaUsuarios({
  idEnEdicion,
  idResaltado,
  onEditar,
  onEliminado,
}: Props) {
  // [ANTES] const usuarios = useUsuarios();
  const [busqueda, setBusqueda] = useState(leerBusquedaDeUrl);
  // [ANTES] // El campo responde de inmediato; el filtrado puede esperar un instante.
  // [ANTES] const busquedaDiferida = useDeferredValue(busqueda);
  const [pagina, setPagina] = useState(leerPaginaDeUrl);
  const [orden, setOrden] = useState(leerOrdenDeUrl);
  // El campo responde de inmediato; al servidor se le pregunta al dejar de
  // escribir, no una vez por tecla.
  const busquedaParaApi = useValorConRetraso(
    busqueda.trim(),
    RETRASO_BUSQUEDA_MS,
  );
  // [ANTES] const usuarios = useUsuarios({ pagina, busqueda: busquedaParaApi });
  const usuarios = useUsuarios({ pagina, busqueda: busquedaParaApi, orden });
  const refTitulo = useRef<HTMLHeadingElement>(null);

  // [ANTES] const visibles = useMemo(
  // [ANTES]   () =>
  // [ANTES]     filtrar(usuarios.data ?? [], busquedaDiferida).toSorted((a, b) =>
  // [ANTES]       COLECCION.compare(a.nombre, b.nombre),
  // [ANTES]     ),
  // [ANTES]   [usuarios.data, busquedaDiferida],
  // [ANTES] );
  // El servidor ya filtra, ordena y pagina: se muestra tal cual llega.
  const visibles = usuarios.data?.data ?? [];
  const totalPaginas = usuarios.data?.meta.totalPages ?? 0;
  const ultimaPagina = Math.max(totalPaginas, 1);

  // Página fuera de rango (un enlace viejo, o se eliminó la única fila de la
  // última página): se corrige durante el render, sin esperar a un efecto.
  if (usuarios.data && !usuarios.isPlaceholderData && pagina > ultimaPagina) {
    setPagina(ultimaPagina);
  }

  // [ANTES] // En el manejador del evento, no en un efecto: es la respuesta a escribir.
  // La URL es un sistema externo: un efecto la sincroniza venga de donde venga
  // el cambio (escribir, cambiar de página o la corrección de arriba).
  useEffect(() => {
    // [ANTES] escribirFiltroEnUrl(busqueda, pagina);
    escribirFiltroEnUrl(busqueda, pagina, orden);
    // [ANTES] }, [busqueda, pagina]);
  }, [busqueda, pagina, orden]);

  function cambiarBusqueda(valor: string) {
    setBusqueda(valor);
    // [ANTES] escribirBusquedaEnUrl(valor);
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
    onEliminado(usuario);
  }

  // [ANTES] const total = usuarios.data?.length ?? 0;
  // [ANTES] const terminoBuscado = busquedaDiferida.trim();
  const total = usuarios.data?.meta.total ?? 0;
  // La búsqueda que produjo lo que se ve: mientras llega la nueva, la anterior.
  const terminoBuscado = usuarios.data?.busqueda ?? '';
  // Lo que se ve está por cambiar: se escribe o ya se pidió otra página.
  const actualizando =
    usuarios.isPlaceholderData || busqueda.trim() !== busquedaParaApi;

  let conteo: string | null = null;
  if (usuarios.data) {
    // [ANTES] conteo = terminoBuscado
    // [ANTES]   ? `${visibles.length} de ${contar(total)}`
    // [ANTES]   : contar(total);
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
    // [ANTES] } else if (total === 0) {
  } else if (total === 0 && !terminoBuscado) {
    contenido = (
      <p className={estilos.estado}>
        Todavía no hay usuarios registrados. Registra el primero con el
        formulario.
      </p>
    );
    // [ANTES] } else if (visibles.length === 0) {
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
          {/* [ANTES] <caption className="sr-only">Usuarios registrados, ordenados por nombre</caption> */}
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
              <th scope="col">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((usuario) =>
              usuario.id === idEnEdicion ? (
                <FilaUsuario.EnEdicion key={usuario.id} usuario={usuario} />
              ) : (
                <FilaUsuario.Normal
                  key={usuario.id}
                  usuario={usuario}
                  resaltada={usuario.id === idResaltado}
                  onEditar={onEditar}
                  onEliminado={manejarEliminado}
                />
              ),
            )}
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

      {/* [ANTES] {contenido} */}
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
