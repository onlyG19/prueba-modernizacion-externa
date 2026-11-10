import { useId, useRef, useState } from 'react';
import { ApiError } from '../api/cliente';
import type { Usuario } from '../api/tipos';
import { BotonIcono, BotonPrimario, BotonSecundario } from '../ui/botones';
import { clases } from '../ui/clases';
import { Dialogo } from '../ui/Dialogo';
import { IconoCerrar, IconoLapiz } from '../ui/iconos';
import { useUsuario } from './consultas';
import { formatearFechaYHora } from './fechas';
import { FormularioEditarUsuario } from './formulario/FormularioEditarUsuario';
import estilos from './ModalUsuario.module.css';
import { formatearRutParcial } from './rut/formato-rut';

export type ModoModal = 'detalle' | 'edicion';

interface Props {
  /** El usuario tal como venía en la fila: se muestra mientras llega el detalle. */
  usuario: Usuario;
  /** Con el ojo se abre el detalle; con el lápiz, directo la edición. */
  modoInicial: ModoModal;
  onCerrar: () => void;
}

/** Dos iniciales para el avatar: "Ana María Rojas" → "AR". */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  const primera = partes[0]?.charAt(0) ?? '';
  const ultima = partes.length > 1 ? (partes.at(-1)?.charAt(0) ?? '') : '';
  return `${primera}${ultima}`.toUpperCase();
}

/** Ventana con el detalle de un usuario, que con el lápiz pasa a editarlo. */
export function ModalUsuario({
  usuario: deLaFila,
  modoInicial,
  onCerrar,
}: Props) {
  const detalle = useUsuario(deLaFila);
  const usuario = detalle.data ?? deLaFila;
  const idTitulo = useId();
  const refEditar = useRef<HTMLButtonElement>(null);
  // La edición trabaja sobre una copia fija: si el detalle se refresca
  // mientras se escribe, el formulario no se reinicia. Si otra persona lo
  // cambió entretanto, el PATCH (con If-Match) responde 412 y se avisa.
  const [enEdicion, setEnEdicion] = useState<Usuario | null>(
    modoInicial === 'edicion' ? deLaFila : null,
  );
  const [mensaje, setMensaje] = useState<string | null>(null);

  const eliminado =
    detalle.error instanceof ApiError && detalle.error.status === 404;

  function editar() {
    setMensaje(null);
    setEnEdicion(usuario);
  }

  function terminarEdicion() {
    setEnEdicion(null);
    // El botón que se usó (Guardar o Cancelar) desaparece: el foco vuelve a
    // "Editar", en vez de perderse dentro de la ventana.
    requestAnimationFrame(() => refEditar.current?.focus());
  }

  return (
    <Dialogo idTitulo={idTitulo} onCerrar={onCerrar}>
      <div className={estilos.cabecera}>
        <span className={estilos.avatar} aria-hidden="true">
          {iniciales(usuario.nombre)}
        </span>
        <div className={estilos.identidad}>
          <h2 id={idTitulo} className={estilos.nombre}>
            {usuario.nombre}
          </h2>
          <p className={clases(estilos.rut, 'cifras')} translate="no">
            {formatearRutParcial(usuario.rut)}
          </p>
        </div>
        <BotonIcono
          etiqueta="Cerrar ventana"
          className={estilos.cerrar}
          onClick={onCerrar}
        >
          <IconoCerrar tamano={20} />
        </BotonIcono>
      </div>

      {/*
        Región viva presente desde el inicio (vacía no ocupa espacio): el
        lector solo anuncia cambios en una región que ya existía. Va dentro de
        la ventana porque, con ella abierta, el resto de la página es inerte.
      */}
      <p role="status" className={mensaje ? estilos.mensaje : undefined}>
        {mensaje}
      </p>

      {eliminado ? (
        <div className={estilos.eliminado} role="alert">
          <p>Este usuario ya no existe: otra persona lo eliminó.</p>
          <BotonSecundario onClick={onCerrar}>Cerrar</BotonSecundario>
        </div>
      ) : enEdicion ? (
        <div className={estilos.edicion}>
          <FormularioEditarUsuario
            usuario={enEdicion}
            onTerminar={terminarEdicion}
            onGuardado={(actualizado) =>
              setMensaje(`Se guardaron los cambios de ${actualizado.nombre}.`)
            }
          />
        </div>
      ) : (
        <>
          <dl className={estilos.datos}>
            <div className={estilos.dato}>
              <dt>Registrado el</dt>
              <dd>{formatearFechaYHora(usuario.creadoEn)}</dd>
            </div>
            <div className={estilos.dato}>
              <dt>Último cambio</dt>
              <dd>{formatearFechaYHora(usuario.actualizadoEn)}</dd>
            </div>
            <div className={estilos.dato}>
              <dt>Versión del registro</dt>
              <dd>
                <span className="cifras">{usuario.version}</span>
                <span className={estilos.ayuda}>
                  Sube con cada cambio: así nadie guarda sobre la edición de
                  otra persona sin saberlo.
                </span>
              </dd>
            </div>
            <div className={estilos.dato}>
              <dt>Identificador</dt>
              <dd className={estilos.identificador} translate="no">
                {usuario.id}
              </dd>
            </div>
          </dl>
          {detalle.isError ? (
            <p className={estilos.nota}>
              No se pudo confirmar el detalle con el servidor: se muestran los
              datos de la tabla.
            </p>
          ) : null}
          <div className={estilos.acciones}>
            <BotonPrimario ref={refEditar} onClick={editar}>
              <IconoLapiz />
              Editar
            </BotonPrimario>
            <BotonSecundario onClick={onCerrar}>Cerrar</BotonSecundario>
          </div>
        </>
      )}
    </Dialogo>
  );
}
