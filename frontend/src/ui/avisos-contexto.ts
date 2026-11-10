import { createContext, use } from 'react';

/** Muestra un aviso breve y lo anuncia a los lectores de pantalla. */
export type Anunciar = (mensaje: string) => void;

export const AvisosContext = createContext<Anunciar | null>(null);

export function useAnunciar(): Anunciar {
  const anunciar = use(AvisosContext);
  if (!anunciar) {
    throw new Error('useAnunciar debe usarse dentro de <Avisos>');
  }
  return anunciar;
}
