import { useEffect, useMemo, type KeyboardEvent } from 'react';
import type { CambiosUsuario, Usuario } from '../../api/tipos';
import { useAnunciar } from '../../ui/avisos-contexto';
import { BotonSecundario } from '../../ui/botones';
import { useActualizarUsuario } from '../consultas';
import { formatearRutParcial } from '../rut/formato-rut';
import { FormularioContext } from './formulario-contexto';
import * as Formulario from './partes';
import { useEstadoFormulario } from './useEstadoFormulario';

interface Props {
  usuario: Usuario;
  /** Al guardar, cancelar o pulsar Escape. */
  onTerminar: () => void;
  /** Solo tras guardar, con el usuario como quedó en el servidor. */
  onGuardado?: (actualizado: Usuario) => void;
}

export function FormularioEditarUsuario({
  usuario,
  onTerminar,
  onGuardado,
}: Props) {
  const actualizar = useActualizarUsuario();
  const anunciar = useAnunciar();

  const inicial = useMemo(
    () => ({ nombre: usuario.nombre, rut: formatearRutParcial(usuario.rut) }),
    [usuario],
  );

  const formulario = useEstadoFormulario({
    inicial,
    guardar: async (datos) => {
      // PATCH: solo se envía lo que cambió.
      const cambios: CambiosUsuario = {};
      if (datos.nombre !== usuario.nombre) {
        cambios.nombre = datos.nombre;
      }
      if (datos.rut !== usuario.rut) {
        cambios.rut = datos.rut;
      }
      if (Object.keys(cambios).length === 0) {
        anunciar('No había cambios que guardar.');
        return;
      }
      const actualizado = await actualizar.mutateAsync({
        id: usuario.id,
        version: usuario.version,
        cambios,
      });
      anunciar(`Cambios guardados: ${actualizado.nombre}.`);
      onGuardado?.(actualizado);
    },
    alGuardar: () => onTerminar(),
  });

  // Al abrir la edición, el foco va al primer campo.
  const idNombre = formulario.meta.ids.nombre;
  useEffect(() => {
    document.getElementById(idNombre)?.focus();
  }, [idNombre]);

  function cancelarConEscape(evento: KeyboardEvent) {
    if (evento.key === 'Escape') {
      onTerminar();
    }
  }

  return (
    <FormularioContext value={formulario}>
      {/* Escape cancela: atajo esperado al editar en un panel. */}
      <div onKeyDown={cancelarConEscape}>
        <Formulario.Marco
          titulo="Editar usuario"
          descripcion={
            <>
              Estás editando a <strong>{usuario.nombre}</strong>.
            </>
          }
        >
          <Formulario.Nombre />
          <Formulario.Rut />
          <Formulario.ErrorGeneral />
          <Formulario.Acciones>
            <Formulario.Enviar mientrasEnvia="Guardando…">
              Guardar cambios
            </Formulario.Enviar>
            <BotonSecundario onClick={onTerminar}>Cancelar</BotonSecundario>
          </Formulario.Acciones>
        </Formulario.Marco>
      </div>
    </FormularioContext>
  );
}
