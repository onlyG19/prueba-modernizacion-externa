import { createContext, use } from 'react';

export interface DatosFormulario {
  nombre: string;
  /** Tal como se ve en el campo (formateado con puntos y guion). */
  rut: string;
}

export interface ErroresFormulario {
  nombre?: string;
  rut?: string;
  /** Errores que no son de un campo (conexión, recurso eliminado…). */
  general?: string;
}

export type Campo = keyof DatosFormulario;

export interface FormularioState {
  datos: DatosFormulario;
  /** Solo los errores que corresponde mostrar ahora. */
  errores: ErroresFormulario;
  enviando: boolean;
}

export interface FormularioActions {
  cambiar: (campo: Campo, valor: string) => void;
  /** Marca el campo como visitado (al salir de él). */
  tocar: (campo: Campo) => void;
  enviar: () => Promise<void>;
}

export interface FormularioMeta {
  /** Ids de los elementos: enlazan etiquetas y errores, y permiten mover el foco. */
  ids: Record<Campo | 'titulo', string>;
}

/**
 * Contrato que comparten las piezas del formulario (`partes.tsx`): no saben si
 * están creando o editando; eso lo decide el proveedor de cada variante.
 */
export interface FormularioContextValue {
  state: FormularioState;
  actions: FormularioActions;
  meta: FormularioMeta;
}

export const FormularioContext = createContext<FormularioContextValue | null>(
  null,
);

export function useFormulario(): FormularioContextValue {
  const valor = use(FormularioContext);
  if (!valor) {
    throw new Error('Las piezas del formulario requieren un proveedor');
  }
  return valor;
}
