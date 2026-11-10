import {
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Usuario } from '../api/tipos';
import { BotonSecundario } from '../ui/botones';
import { IconoBuscar } from '../ui/iconos';
import { useUsuarios } from './consultas';
import * as FilaUsuario from './FilaUsuario';
import estilos from './ListaUsuarios.module.css';

/** Creado una vez: ordena en español y sin distinguir tildes. */
const COLECCION = new Intl.Collator('es', { sensitivity: 'base' });
const FORMATO_NUMERO = new Intl.NumberFormat('es-CL');
/** Parámetro de la URL con la búsqueda: un enlace o una recarga la conservan. */
const PARAMETRO_BUSQUEDA = 'buscar';
const SIN_TILDES = /\p{Diacritic}/gu;
const SEPARADORES_RUT = /[.\-\s]/g;

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(SIN_TILDES, '').toLowerCase();

/** Coincide por nombre (sin tildes) o por RUT (con o sin puntos y guion). */
function filtrar(usuarios: Usuario[], busqueda: string): Usuario[] {
  const texto = normalizar(busqueda.trim());
  if (!texto) {
    return usuarios;
  }
  const rutBuscado = texto.replace(SEPARADORES_RUT, '');
  return usuarios.filter(
    (usuario) =>
      normalizar(usuario.nombre).includes(texto) ||
      (rutBuscado !== '' &&
        usuario.rut
          .replace(SEPARADORES_RUT, '')
          .toLowerCase()
          .includes(rutBuscado)),
  );
}

/** Con espacio duro: el número nunca queda separado de su palabra. */
const contar = (n: number) =>
  `${FORMATO_NUMERO.format(n)}\u00a0${n === 1 ? 'usuario' : 'usuarios'}`;

function leerBusquedaDeUrl(): string {
  return (
    new URLSearchParams(window.location.search).get(PARAMETRO_BUSQUEDA) ?? ''
  );
}

function escribirBusquedaEnUrl(busqueda: string) {
  const url = new URL(window.location.href);
  if (busqueda.trim()) {
    url.searchParams.set(PARAMETRO_BUSQUEDA, busqueda.trim());
  } else {
    url.searchParams.delete(PARAMETRO_BUSQUEDA);
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
  const usuarios = useUsuarios();
  const [busqueda, setBusqueda] = useState(leerBusquedaDeUrl);
  // El campo responde de inmediato; el filtrado puede esperar un instante.
  const busquedaDiferida = useDeferredValue(busqueda);
  const refTitulo = useRef<HTMLHeadingElement>(null);

  const visibles = useMemo(
    () =>
      filtrar(usuarios.data ?? [], busquedaDiferida).toSorted((a, b) =>
        COLECCION.compare(a.nombre, b.nombre),
      ),
    [usuarios.data, busquedaDiferida],
  );

  // En el manejador del evento, no en un efecto: es la respuesta a escribir.
  function cambiarBusqueda(valor: string) {
    setBusqueda(valor);
    escribirBusquedaEnUrl(valor);
  }

  function manejarEliminado(usuario: Usuario) {
    // La fila desaparece: el foco pasa al título de la lista y no se pierde.
    refTitulo.current?.focus();
    onEliminado(usuario);
  }

  const total = usuarios.data?.length ?? 0;
  const terminoBuscado = busquedaDiferida.trim();

  let conteo: string | null = null;
  if (usuarios.data) {
    conteo = terminoBuscado
      ? `${visibles.length} de ${contar(total)}`
      : contar(total);
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
  } else if (total === 0) {
    contenido = (
      <p className={estilos.estado}>
        Todavía no hay usuarios registrados. Registra el primero con el
        formulario.
      </p>
    );
  } else if (visibles.length === 0) {
    contenido = (
      <p className={estilos.estado}>
        Ningún usuario coincide con «{terminoBuscado}».
      </p>
    );
  } else {
    contenido = (
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

      {contenido}
    </section>
  );
}
