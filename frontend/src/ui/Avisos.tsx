import { useCallback, useEffect, useState, type ReactNode } from 'react';
import estilos from './Avisos.module.css';
import { AvisosContext } from './avisos-contexto';

/** Tiempo que el aviso queda visible. */
const DURACION_MS = 6000;

interface Aviso {
  id: number;
  texto: string;
}

/**
 * Proveedor de avisos ("Usuario registrado", "Cambios guardados").
 *
 * @remarks
 * La región `role="status"` existe siempre en el DOM: los lectores de pantalla
 * solo anuncian cambios dentro de una región viva que ya estaba presente.
 */
export function Avisos({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const anunciar = useCallback((texto: string) => {
    setAviso((anterior) => ({ id: (anterior?.id ?? 0) + 1, texto }));
  }, []);

  const idAviso = aviso?.id;
  useEffect(() => {
    if (idAviso === undefined) {
      return;
    }
    const temporizador = window.setTimeout(() => setAviso(null), DURACION_MS);
    return () => window.clearTimeout(temporizador);
  }, [idAviso]);

  return (
    <AvisosContext value={anunciar}>
      {children}
      <div className={estilos.region} role="status">
        {aviso ? (
          <p key={aviso.id} className={estilos.aviso}>
            {aviso.texto}
          </p>
        ) : null}
      </div>
    </AvisosContext>
  );
}
