/*
 * Variantes explícitas de una fila de la lista. Se usan con
 * `import * as FilaUsuario from './FilaUsuario'`: `<FilaUsuario.Normal>` y
 * `<FilaUsuario.EnEdicion>`, en vez de una sola fila llena de props booleanas.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { Usuario } from '../api/tipos';
import { useAnunciar } from '../ui/avisos-contexto';
import { BotonEnLinea, BotonPeligro, BotonSecundario } from '../ui/botones';
import { clases } from '../ui/clases';
import { useEliminarUsuario } from './consultas';
import estilos from './FilaUsuario.module.css';
import { erroresDeServidor } from './formulario/errores-formulario';
import { idBotonEditar } from './ids';
import { formatearRutParcial } from './rut/formato-rut';

function CeldasDatos({ usuario }: { usuario: Usuario }) {
  return (
    <>
      <td className={estilos.nombre}>{usuario.nombre}</td>
      {/* Sin lanzar: un RUT antiguo inválido igual se muestra. */}
      <td className={clases(estilos.rut, 'cifras')} translate="no">
        {formatearRutParcial(usuario.rut)}
      </td>
    </>
  );
}

interface PropsNormal {
  usuario: Usuario;
  /** Recién registrado: se destaca un instante para mostrar qué cambió. */
  resaltada: boolean;
  onEditar: (usuario: Usuario) => void;
  onEliminado: (usuario: Usuario) => void;
}

export function Normal({
  usuario,
  resaltada,
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
    <tr className={clases(estilos.fila, resaltada && estilos.resaltada)}>
      <CeldasDatos usuario={usuario} />
      <td className={estilos.acciones}>
        <BotonEnLinea
          id={idBotonEditar(usuario.id)}
          onClick={() => onEditar(usuario)}
          aria-label={`Editar a ${usuario.nombre}`}
        >
          Editar
        </BotonEnLinea>
        <BotonEnLinea
          ref={refEliminar}
          onClick={() => setConfirmando(true)}
          aria-label={`Eliminar a ${usuario.nombre}`}
        >
          Eliminar
        </BotonEnLinea>
      </td>
    </tr>
  );
}

/** La fila del usuario que se está editando en el formulario. */
export function EnEdicion({ usuario }: { usuario: Usuario }) {
  return (
    <tr className={clases(estilos.fila, estilos.enEdicion)} aria-current="true">
      <CeldasDatos usuario={usuario} />
      <td className={estilos.acciones}>
        <span className={estilos.marcaEdicion}>Editando</span>
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
      <td colSpan={3}>
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
