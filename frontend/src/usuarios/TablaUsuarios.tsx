import { useCallback, useRef, useState } from 'react';
import type { Usuario } from '../api/tipos';
import { ListaUsuarios } from './ListaUsuarios';
import { ModalUsuario, type ModoModal } from './ModalUsuario';

interface Props {
  /** Recién registrado en la otra pestaña: su fila se destaca al llegar. */
  idResaltado: Usuario['id'] | null;
}

/** La tabla de usuarios y la ventana con el detalle (y la edición) de uno. */
export function TablaUsuarios({ idResaltado }: Props) {
  const [abierto, setAbierto] = useState<{
    usuario: Usuario;
    modo: ModoModal;
  } | null>(null);
  // El botón que abrió la ventana: al cerrarla, el foco vuelve a él.
  const origen = useRef<HTMLElement | null>(null);

  const abrir = useCallback((usuario: Usuario, modo: ModoModal) => {
    origen.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setAbierto({ usuario, modo });
  }, []);

  const cerrar = useCallback(() => {
    setAbierto(null);
    requestAnimationFrame(() => {
      // Si la fila ya no está (cambió de página al renombrarla), el foco va
      // al título de la lista en vez de perderse.
      if (origen.current?.isConnected) {
        origen.current.focus();
      } else {
        document.getElementById('titulo-usuarios')?.focus();
      }
    });
  }, []);

  return (
    <>
      <ListaUsuarios
        idSeleccionado={abierto?.usuario.id ?? null}
        idResaltado={idResaltado}
        onVer={(usuario) => abrir(usuario, 'detalle')}
        onEditar={(usuario) => abrir(usuario, 'edicion')}
      />
      {abierto ? (
        <ModalUsuario
          key={abierto.usuario.id}
          usuario={abierto.usuario}
          modoInicial={abierto.modo}
          onCerrar={cerrar}
        />
      ) : null}
    </>
  );
}
