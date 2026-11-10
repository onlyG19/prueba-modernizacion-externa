import { useCallback, useState } from 'react';
import type { Usuario } from '../api/tipos';
import { FormularioCrearUsuario } from './formulario/FormularioCrearUsuario';
import { FormularioEditarUsuario } from './formulario/FormularioEditarUsuario';
import { idBotonEditar } from './ids';
import { ListaUsuarios } from './ListaUsuarios';
import estilos from './RegistroUsuarios.module.css';

/** Formulario (crear o editar) a un lado y el registro al otro. */
export function RegistroUsuarios() {
  const [enEdicion, setEnEdicion] = useState<Usuario | null>(null);
  // [ANTES] const [idResaltado, setIdResaltado] = useState<number | null>(null);
  const [idResaltado, setIdResaltado] = useState<Usuario['id'] | null>(null);

  const idEnEdicion = enEdicion?.id ?? null;
  const terminarEdicion = useCallback(() => {
    setEnEdicion(null);
    if (idEnEdicion !== null) {
      // Al cerrar la edición, el foco vuelve al "Editar" que la abrió.
      requestAnimationFrame(() =>
        document.getElementById(idBotonEditar(idEnEdicion))?.focus(),
      );
    }
  }, [idEnEdicion]);

  const manejarEliminado = useCallback(
    (usuario: Usuario) => {
      if (usuario.id === idEnEdicion) {
        setEnEdicion(null);
      }
    },
    [idEnEdicion],
  );

  return (
    <div className={estilos.registro}>
      <div className={estilos.columnaFormulario}>
        {enEdicion ? (
          <FormularioEditarUsuario
            key={enEdicion.id}
            usuario={enEdicion}
            onTerminar={terminarEdicion}
          />
        ) : (
          <FormularioCrearUsuario
            onRegistrado={(usuario) => setIdResaltado(usuario.id)}
          />
        )}
      </div>
      <ListaUsuarios
        idEnEdicion={idEnEdicion}
        idResaltado={idResaltado}
        onEditar={setEnEdicion}
        onEliminado={manejarEliminado}
      />
    </div>
  );
}
