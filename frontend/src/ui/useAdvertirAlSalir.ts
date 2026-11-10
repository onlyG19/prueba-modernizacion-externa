import { useEffect } from 'react';

/**
 * Con cambios sin guardar, el navegador pide confirmación antes de cerrar o
 * recargar la pestaña.
 */
export function useAdvertirAlSalir(hayCambios: boolean): void {
  useEffect(() => {
    if (!hayCambios) {
      return;
    }
    const advertir = (evento: BeforeUnloadEvent) => evento.preventDefault();
    window.addEventListener('beforeunload', advertir);
    return () => window.removeEventListener('beforeunload', advertir);
  }, [hayCambios]);
}
