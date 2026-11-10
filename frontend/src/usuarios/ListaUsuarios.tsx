// [ANTES] import {
// [ANTES]   useDeferredValue,
// [ANTES]   useMemo,
// [ANTES]   useRef,
// [ANTES]   useState,
// [ANTES]   type ReactNode,
// [ANTES] } from 'react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Usuario } from '../api/tipos';
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
function escribirFiltroEnUrl(busqueda: string, pagina: number) {
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
  window.history.replaceState(window.history.state, '', url);
}

interface Props {
  idEnEdicion: number | null;
  idResaltado: number | null;
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
  // El campo responde de inmediato; al servidor se le pregunta al dejar de
  // escribir, no una vez por tecla.
  const busquedaParaApi = useValorConRetraso(
    busqueda.trim(),
    RETRASO_BUSQUEDA_MS,
  );
  const usuarios = useUsuarios({ pagina, busqueda: busquedaParaApi });
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
    escribirFiltroEnUrl(busqueda, pagina);
  }, [busqueda, pagina]);

  function cambiarBusqueda(valor: string) {
    setBusqueda(valor);
    // [ANTES] escribirBusquedaEnUrl(valor);
    // Otra búsqueda, otros resultados: se parte de la primera página.
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
          <caption className="sr-only">
            Usuarios registrados, ordenados por nombre
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
