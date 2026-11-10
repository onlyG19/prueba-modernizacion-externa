import type { Usuario } from '../../api/tipos';
import { useAnunciar } from '../../ui/avisos-contexto';
import { useCrearUsuario } from '../consultas';
import { FormularioContext, type DatosFormulario } from './formulario-contexto';
import * as Formulario from './partes';
import { useEstadoFormulario } from './useEstadoFormulario';

/** Valor inicial fuera del componente: misma referencia en cada render. */
const VACIO: DatosFormulario = { nombre: '', rut: '' };

interface Props {
  onRegistrado: (usuario: Usuario) => void;
}

export function FormularioCrearUsuario({ onRegistrado }: Props) {
  const crear = useCrearUsuario();
  const anunciar = useAnunciar();

  const formulario = useEstadoFormulario({
    inicial: VACIO,
    guardar: async (datos) => {
      const creado = await crear.mutateAsync(datos);
      anunciar(`Usuario registrado: ${creado.nombre}.`);
      onRegistrado(creado);
    },
    alGuardar: ({ reiniciar }) => reiniciar(),
  });

  return (
    <FormularioContext value={formulario}>
      <Formulario.Marco titulo="Registrar usuario">
        <Formulario.Nombre />
        <Formulario.Rut />
        <Formulario.ErrorGeneral />
        <Formulario.Acciones>
          <Formulario.Enviar mientrasEnvia="Registrando…">
            Registrar usuario
          </Formulario.Enviar>
        </Formulario.Acciones>
      </Formulario.Marco>
    </FormularioContext>
  );
}
