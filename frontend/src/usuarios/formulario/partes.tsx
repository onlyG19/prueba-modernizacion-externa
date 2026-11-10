/*
 * Piezas del formulario de usuario (componentes compuestos). Se usan con un
 * import de espacio de nombres: `import * as Formulario from './partes'` y
 * `<Formulario.Marco>`, `<Formulario.Nombre />`…
 */
import type { FormEvent, ReactNode } from 'react';
import { BotonPrimario } from '../../ui/botones';
import { clases } from '../../ui/clases';
import { CampoRut } from '../rut/CampoRut';
import { useFormulario } from './formulario-contexto';
import estilos from '../../ui/formulario.module.css';

interface PropsMarco {
  titulo: string;
  descripcion?: ReactNode;
  children: ReactNode;
}

export function Marco({ titulo, descripcion, children }: PropsMarco) {
  const { state, actions, meta } = useFormulario();

  function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    void actions.enviar();
  }

  return (
    <section className={estilos.panel} aria-labelledby={meta.ids.titulo}>
      <h2 id={meta.ids.titulo} className={estilos.titulo}>
        {titulo}
      </h2>
      {descripcion ? (
        <p className={estilos.descripcion}>{descripcion}</p>
      ) : null}
      <form
        className={estilos.formulario}
        onSubmit={manejarEnvio}
        aria-busy={state.enviando}
        noValidate
      >
        {children}
      </form>
    </section>
  );
}

export function Nombre() {
  const { state, actions, meta } = useFormulario();
  const { ids } = meta;
  const error = state.errores.nombre;
  const idError = `${ids.nombre}-error`;

  return (
    <div className={estilos.campo}>
      <label htmlFor={ids.nombre} className={estilos.etiqueta}>
        Nombre
      </label>
      <input
        id={ids.nombre}
        name="nombre"
        className={clases(estilos.entrada, error && estilos.entradaInvalida)}
        value={state.datos.nombre}
        onChange={(evento) => actions.cambiar('nombre', evento.target.value)}
        onBlur={() => actions.tocar('nombre')}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
      />
      {/* Región viva persistente: el error se anuncia al aparecer. */}
      <div id={idError} aria-live="polite">
        {error ? <p className={estilos.error}>{error}</p> : null}
      </div>
    </div>
  );
}

export function Rut() {
  const { state, actions, meta } = useFormulario();
  return (
    <CampoRut
      id={meta.ids.rut}
      valor={state.datos.rut}
      onCambio={(valor) => actions.cambiar('rut', valor)}
      onBlur={() => actions.tocar('rut')}
      error={state.errores.rut}
    />
  );
}

/** Errores que no pertenecen a un campo (conexión, recurso eliminado…). */
export function ErrorGeneral() {
  const { state } = useFormulario();
  return state.errores.general ? (
    <p className={estilos.errorGeneral} role="alert">
      {state.errores.general}
    </p>
  ) : null;
}

export function Acciones({ children }: { children: ReactNode }) {
  return <div className={estilos.acciones}>{children}</div>;
}

interface PropsEnviar {
  children: ReactNode;
  /** Texto mientras se guarda: la misma acción, en gerundio. */
  mientrasEnvia: ReactNode;
}

export function Enviar({ children, mientrasEnvia }: PropsEnviar) {
  const { state } = useFormulario();
  return (
    <BotonPrimario type="submit" aria-disabled={state.enviando || undefined}>
      {state.enviando ? mientrasEnvia : children}
    </BotonPrimario>
  );
}
