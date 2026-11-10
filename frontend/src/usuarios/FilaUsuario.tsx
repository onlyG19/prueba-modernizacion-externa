/*
 * Variantes explícitas de una fila de la lista. Se usan con
 * `import * as FilaUsuario from './FilaUsuario'`: `<FilaUsuario.Normal>`, y
 * la confirmación de borrado como su propia variante, en vez de una sola fila
 * llena de props booleanas.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { Usuario } from '../api/tipos';
import { useAnunciar } from '../ui/avisos-contexto';
import { BotonIcono, BotonPeligro, BotonSecundario } from '../ui/botones';
import { clases } from '../ui/clases';
import { IconoBasura, IconoLapiz, IconoOjo } from '../ui/iconos';
import { useEliminarUsuario } from './consultas';
import { formatearFecha } from './fechas';
import estilos from './FilaUsuario.module.css';
import { erroresDeServidor } from './formulario/errores-formulario';
import { formatearRutParcial } from './rut/formato-rut';

/** Columnas de la tabla: la confirmación de borrado ocupa la fila completa. */
const COLUMNAS = 4;

function CeldasDatos({ usuario }: { usuario: Usuario }) {
  return (
    <>
      <td className={estilos.nombre}>{usuario.nombre}</td>
      {/* Sin lanzar: un RUT antiguo inválido igual se muestra. */}
      <td className={clases(estilos.rut, 'cifras')} translate="no">
        {formatearRutParcial(usuario.rut)}
      </td>
      <td className={estilos.fecha}>
        <time dateTime={usuario.creadoEn}>
          {formatearFecha(usuario.creadoEn)}
        </time>
      </td>
    </>
  );
}

interface PropsNormal {
  usuario: Usuario;
  /** Recién registrado: se destaca un instante para mostrar qué cambió. */
  resaltada: boolean;
  /** Abierta en la ventana de detalle: queda marcada mientras tanto. */
  seleccionada: boolean;
  onVer: (usuario: Usuario) => void;
  onEditar: (usuario: Usuario) => void;
  onEliminado: (usuario: Usuario) => void;
}

export function Normal({
  usuario,
  resaltada,
  seleccionada,
  onVer,
  onEditar,
  onEliminado,
}: PropsNormal) {
  const [confirmando, setConfirmando] = useState(false);
  const refEliminar = useRef<HTMLButtonElement>(null);

  if (confirmando) {
    return (
      <Confirmacion
        usuario={usuario}
        onCancelar={() => {
          setConfirmando(false);
          // Devuelve el foco al botón que abrió la confirmación.
          requestAnimationFrame(() => refEliminar.current?.focus());
        }}
        onEliminado={onEliminado}
      />
    );
  }

  return (
    <tr
      className={clases(
        estilos.fila,
        resaltada && estilos.resaltada,
        seleccionada && estilos.seleccionada,
      )}
    >
      <CeldasDatos usuario={usuario} />
      <td className={estilos.acciones}>
        <BotonIcono
          etiqueta={`Ver detalle de ${usuario.nombre}`}
          onClick={() => onVer(usuario)}
        >
          <IconoOjo />
        </BotonIcono>
        <BotonIcono
          etiqueta={`Editar a ${usuario.nombre}`}
          onClick={() => onEditar(usuario)}
        >
          <IconoLapiz />
        </BotonIcono>
        <BotonIcono
          ref={refEliminar}
          etiqueta={`Eliminar a ${usuario.nombre}`}
          className={estilos.eliminar}
          onClick={() => setConfirmando(true)}
        >
          <IconoBasura />
        </BotonIcono>
      </td>
    </tr>
  );
}

interface PropsConfirmacion {
  usuario: Usuario;
  onCancelar: () => void;
  onEliminado: (usuario: Usuario) => void;
}

function Confirmacion({ usuario, onCancelar, onEliminado }: PropsConfirmacion) {
  const eliminar = useEliminarUsuario();
  const anunciar = useAnunciar();
  const idPregunta = useId();
  const refCancelar = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Ante una acción destructiva, el foco cae en la opción segura.
  useEffect(() => {
    refCancelar.current?.focus();
  }, []);

  async function confirmar() {
    if (eliminar.isPending) {
      return;
    }
    setError(null);
    try {
      await eliminar.mutateAsync(usuario.id);
      anunciar(`Usuario eliminado: ${usuario.nombre}.`);
      onEliminado(usuario);
    } catch (falla) {
      setError(
        erroresDeServidor(falla, usuario.rut).general ??
          'No se pudo eliminar. Inténtalo de nuevo.',
      );
    }
  }

  function cancelarConEscape(evento: KeyboardEvent) {
    if (evento.key === 'Escape') {
      onCancelar();
    }
  }

  return (
    <tr className={estilos.confirmacion}>
      <td colSpan={COLUMNAS}>
        <div
          className={estilos.contenidoConfirmacion}
          role="group"
          aria-labelledby={idPregunta}
          onKeyDown={cancelarConEscape}
        >
          <p id={idPregunta}>
            ¿Eliminar a <strong>{usuario.nombre}</strong> (
            <span className="cifras">{formatearRutParcial(usuario.rut)}</span>
            )? Esta acción no se puede deshacer.
          </p>
          {error ? (
            <p className={estilos.error} role="alert">
              {error}
            </p>
          ) : null}
          <div className={estilos.botonesConfirmacion}>
            <BotonPeligro
              onClick={() => void confirmar()}
              aria-disabled={eliminar.isPending || undefined}
            >
              {eliminar.isPending ? 'Eliminando…' : 'Eliminar usuario'}
            </BotonPeligro>
            <BotonSecundario ref={refCancelar} onClick={onCancelar}>
              Cancelar
            </BotonSecundario>
          </div>
        </div>
      </td>
    </tr>
  );
}
