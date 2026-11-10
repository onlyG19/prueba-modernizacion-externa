import { Rut } from '@dominio/rut';
import { useCallback, useId, useState } from 'react';
import { useAdvertirAlSalir } from '../../ui/useAdvertirAlSalir';
import { erroresDeServidor, validarFormulario } from './errores-formulario';
import type {
  Campo,
  DatosFormulario,
  ErroresFormulario,
  FormularioContextValue,
} from './formulario-contexto';

/** Datos ya validados, listos para la API (RUT en forma canónica). */
export interface DatosValidos {
  nombre: string;
  rut: string;
}

interface Opciones {
  inicial: DatosFormulario;
  /** Persiste los datos; si lanza, el error se muestra en el formulario. */
  guardar: (datos: DatosValidos) => Promise<void>;
  /** Qué hacer tras guardar con éxito (reiniciar, cerrar la edición…). */
  alGuardar: (acciones: { reiniciar: () => void }) => void;
}

const SIN_TOCAR: Record<Campo, boolean> = { nombre: false, rut: false };

/**
 * Estado compartido por las variantes del formulario. Implementa el contrato
 * {@link FormularioContextValue} que consumen las piezas de `partes.tsx`.
 */
export function useEstadoFormulario({
  inicial,
  guardar,
  alGuardar,
}: Opciones): FormularioContextValue {
  const idBase = useId();
  const ids = {
    nombre: `${idBase}-nombre`,
    rut: `${idBase}-rut`,
    titulo: `${idBase}-titulo`,
  };
  // El foco se mueve por id: el contrato del formulario no necesita refs.
  const enfocar = (campo: Campo) =>
    document.getElementById(ids[campo])?.focus();

  const [datos, setDatos] = useState(inicial);
  const [tocados, setTocados] = useState(SIN_TOCAR);
  const [erroresServidor, setErroresServidor] = useState<ErroresFormulario>({});
  const [enviando, setEnviando] = useState(false);

  // Derivado en cada render: un error local se muestra recién cuando la
  // persona salió del campo o intentó enviar ("premiar pronto, castigar tarde").
  const locales = validarFormulario(datos);
  const errores: ErroresFormulario = {
    nombre: (tocados.nombre && locales.nombre) || erroresServidor.nombre,
    rut: (tocados.rut && locales.rut) || erroresServidor.rut,
    general: erroresServidor.general,
  };

  useAdvertirAlSalir(
    datos.nombre !== inicial.nombre || datos.rut !== inicial.rut,
  );

  const cambiar = useCallback((campo: Campo, valor: string) => {
    setDatos((actuales) => ({ ...actuales, [campo]: valor }));
    // Al corregir el campo, su error del servidor deja de aplicar.
    setErroresServidor((actuales) => ({
      ...actuales,
      [campo]: undefined,
      general: undefined,
    }));
  }, []);

  const tocar = useCallback((campo: Campo) => {
    setTocados((actuales) =>
      actuales[campo] ? actuales : { ...actuales, [campo]: true },
    );
  }, []);

  const reiniciar = useCallback(() => {
    setDatos(inicial);
    setTocados(SIN_TOCAR);
    setErroresServidor({});
    document.getElementById(`${idBase}-nombre`)?.focus();
  }, [inicial, idBase]);

  async function enviar() {
    if (enviando) {
      return;
    }
    setTocados({ nombre: true, rut: true });

    const erroresLocales = validarFormulario(datos);
    if (erroresLocales.nombre || erroresLocales.rut) {
      // El foco va al primer campo con error: ahí se lee el mensaje.
      enfocar(erroresLocales.nombre ? 'nombre' : 'rut');
      return;
    }

    setEnviando(true);
    setErroresServidor({});
    try {
      await guardar({
        nombre: datos.nombre.trim(),
        rut: Rut.crear(datos.rut).toString(),
      });
      alGuardar({ reiniciar });
    } catch (error) {
      const delServidor = erroresDeServidor(error, datos.rut);
      setErroresServidor(delServidor);
      if (delServidor.rut) {
        enfocar('rut');
      } else if (delServidor.nombre) {
        enfocar('nombre');
      }
    } finally {
      setEnviando(false);
    }
  }

  return {
    state: { datos, errores, enviando },
    actions: { cambiar, tocar, enviar },
    meta: { ids },
  };
}
