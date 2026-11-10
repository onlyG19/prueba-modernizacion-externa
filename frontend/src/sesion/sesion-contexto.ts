import { createContext, use } from 'react';
import type { Credenciales } from '../api/tipos';
import type { Sesion } from './almacen-sesion';

export type MotivoCierre = 'manual' | 'expirada';

export interface SesionState {
  sesion: Sesion | null;
  /** Por qué se cerró la última sesión (para explicárselo a la persona). */
  motivoCierre: MotivoCierre | null;
}

export interface SesionActions {
  /** @throws ApiError | ErrorDeConexion si el login falla. */
  iniciarSesion: (credenciales: Credenciales) => Promise<void>;
  cerrarSesion: (motivo: MotivoCierre) => void;
}

/**
 * Contrato del contexto de sesión: los componentes dependen de esta interfaz,
 * no de cómo se guarda la sesión (`state` + `actions`).
 */
export interface SesionContextValue {
  state: SesionState;
  actions: SesionActions;
}

export const SesionContext = createContext<SesionContextValue | null>(null);

export function useSesion(): SesionContextValue {
  const valor = use(SesionContext);
  if (!valor) {
    throw new Error('useSesion debe usarse dentro de <SesionProvider>');
  }
  return valor;
}

/** Para componentes que solo existen con la sesión iniciada (la consola). */
export function useSesionActiva(): Sesion {
  const { state } = useSesion();
  if (!state.sesion) {
    throw new Error('Este componente requiere una sesión iniciada');
  }
  return state.sesion;
}
