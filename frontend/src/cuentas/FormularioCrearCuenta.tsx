import { normalizarUsername } from '@dominio-cuentas/credenciales';
import { useId, useState, type FormEvent } from 'react';
import type { Cuenta } from '../api/tipos';
import { useAnunciar } from '../ui/avisos-contexto';
import { BotonEnLinea, BotonPrimario } from '../ui/botones';
import { clases } from '../ui/clases';
import estilos from '../ui/formulario.module.css';
import { IconoOjo, IconoOjoTachado, IconoSincronizar } from '../ui/iconos';
import { useAdvertirAlSalir } from '../ui/useAdvertirAlSalir';
import { useCrearCuenta } from './consultas';
import propios from './FormularioCrearCuenta.module.css';
import { generarContrasena, LARGO_GENERADA } from './generar-contrasena';
import {
  erroresDeServidor,
  validarCuenta,
  type CampoCuenta,
  type DatosCuenta,
  type ErroresCuenta,
} from './reglas-cuenta';

const VACIO: DatosCuenta = { username: '', password: '' };
const SIN_TOCAR: Record<CampoCuenta, boolean> = {
  username: false,
  password: false,
};

interface Props {
  onCreada: (cuenta: Cuenta) => void;
}

/**
 * Formulario para que el administrador cree una cuenta: usuario y contraseña,
 * con la opción de ver la contraseña o generar una segura.
 *
 * @remarks No se pide repetir la contraseña: el botón "Mostrar" cumple mejor
 * esa función (se revisa lo escrito en vez de escribirlo dos veces).
 */
export function FormularioCrearCuenta({ onCreada }: Props) {
  const crear = useCrearCuenta();
  const anunciar = useAnunciar();

  const idBase = useId();
  const ids = {
    titulo: `${idBase}-titulo`,
    username: `${idBase}-usuario`,
    password: `${idBase}-contrasena`,
  };
  const enfocar = (campo: CampoCuenta) =>
    document.getElementById(ids[campo])?.focus();

  const [datos, setDatos] = useState(VACIO);
  const [tocados, setTocados] = useState(SIN_TOCAR);
  const [erroresServidor, setErroresServidor] = useState<ErroresCuenta>({});
  const [contrasenaVisible, setContrasenaVisible] = useState(false);
  /** Lo que se anuncia al lector de pantalla tras mostrar o generar. */
  const [estadoContrasena, setEstadoContrasena] = useState('');

  // Como en el formulario de usuarios: un error local aparece recién al salir
  // del campo o al intentar enviar, no mientras se escribe.
  const locales = validarCuenta(datos);
  const errores: ErroresCuenta = {
    username:
      (tocados.username && locales.username) || erroresServidor.username,
    password:
      (tocados.password && locales.password) || erroresServidor.password,
    general: erroresServidor.general,
  };

  useAdvertirAlSalir(datos.username !== '' || datos.password !== '');

  function cambiar(campo: CampoCuenta, valor: string) {
    setDatos((actuales) => ({ ...actuales, [campo]: valor }));
    // Al corregir el campo, su error del servidor deja de aplicar.
    setErroresServidor((actuales) => ({
      ...actuales,
      [campo]: undefined,
      general: undefined,
    }));
  }

  function tocar(campo: CampoCuenta) {
    setTocados((actuales) =>
      actuales[campo] ? actuales : { ...actuales, [campo]: true },
    );
  }

  function alternarVisibilidad() {
    const visible = !contrasenaVisible;
    setContrasenaVisible(visible);
    setEstadoContrasena(
      visible ? 'La contraseña está visible.' : 'La contraseña está oculta.',
    );
  }

  function generar() {
    cambiar('password', generarContrasena());
    // Se muestra: quien la generó tiene que poder copiarla para entregarla.
    setContrasenaVisible(true);
    setEstadoContrasena(
      `Se generó una contraseña de ${LARGO_GENERADA} caracteres; quedó visible en el campo.`,
    );
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (crear.isPending) {
      return;
    }
    setTocados({ username: true, password: true });

    const erroresLocales = validarCuenta(datos);
    if (erroresLocales.username || erroresLocales.password) {
      // El foco va al primer campo con error: ahí se lee el mensaje.
      enfocar(erroresLocales.username ? 'username' : 'password');
      return;
    }

    setErroresServidor({});
    try {
      const creada = await crear.mutateAsync({
        username: normalizarUsername(datos.username),
        password: datos.password,
      });
      anunciar(`Cuenta creada: ${creada.username}.`);
      onCreada(creada);
      setDatos(VACIO);
      setTocados(SIN_TOCAR);
      setContrasenaVisible(false);
      setEstadoContrasena('');
      enfocar('username');
    } catch (error) {
      const delServidor = erroresDeServidor(error, datos.username);
      setErroresServidor(delServidor);
      if (delServidor.username) {
        enfocar('username');
      } else if (delServidor.password) {
        enfocar('password');
      }
    }
  }

  const idAyudaUsuario = `${ids.username}-ayuda`;
  const idErrorUsuario = `${ids.username}-error`;
  const idAyudaContrasena = `${ids.password}-ayuda`;
  const idErrorContrasena = `${ids.password}-error`;

  return (
    <section className={estilos.panel} aria-labelledby={ids.titulo}>
      <h2 id={ids.titulo} className={estilos.titulo}>
        Crear cuenta
      </h2>
      <p className={estilos.descripcion}>
        Para que otra persona ingrese a la consola con su propio usuario.
      </p>
      <form
        className={estilos.formulario}
        onSubmit={(evento) => void enviar(evento)}
        aria-busy={crear.isPending}
        noValidate
      >
        <div className={estilos.campo}>
          <label htmlFor={ids.username} className={estilos.etiqueta}>
            Usuario
          </label>
          <p id={idAyudaUsuario} className={estilos.ayuda}>
            Entre 3 y 30 caracteres: letras sin tildes, números, punto, guion o
            guion bajo. Por ejemplo, maria.lopez.
          </p>
          <input
            id={ids.username}
            name="username"
            className={clases(
              estilos.entrada,
              errores.username && estilos.entradaInvalida,
            )}
            value={datos.username}
            onChange={(evento) => cambiar('username', evento.target.value)}
            onBlur={() => tocar('username')}
            // Es un usuario nuevo, no el de quien está usando la consola.
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            translate="no"
            aria-invalid={errores.username ? true : undefined}
            aria-describedby={clases(
              idAyudaUsuario,
              errores.username && idErrorUsuario,
            )}
          />
          {/* Región viva persistente: el error se anuncia al aparecer. */}
          <div id={idErrorUsuario} aria-live="polite">
            {errores.username ? (
              <p className={estilos.error}>{errores.username}</p>
            ) : null}
          </div>
        </div>

        <div className={estilos.campo}>
          <label htmlFor={ids.password} className={estilos.etiqueta}>
            Contraseña
          </label>
          <p id={idAyudaContrasena} className={estilos.ayuda}>
            Al menos 12 caracteres; una frase de varias palabras es segura y
            fácil de recordar. Cópiala antes de crear la cuenta: después no se
            vuelve a mostrar.
          </p>
          <input
            id={ids.password}
            name="password"
            type={contrasenaVisible ? 'text' : 'password'}
            className={clases(
              estilos.entrada,
              errores.password && estilos.entradaInvalida,
            )}
            value={datos.password}
            onChange={(evento) => cambiar('password', evento.target.value)}
            onBlur={() => tocar('password')}
            // Así el gestor de contraseñas no la confunde con la del admin.
            autoComplete="new-password"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={errores.password ? true : undefined}
            aria-describedby={clases(
              idAyudaContrasena,
              errores.password && idErrorContrasena,
            )}
          />
          <div id={idErrorContrasena} aria-live="polite">
            {errores.password ? (
              <p className={estilos.error}>{errores.password}</p>
            ) : null}
          </div>
          <div className={propios.herramientas}>
            <BotonEnLinea
              onClick={alternarVisibilidad}
              aria-controls={ids.password}
            >
              {contrasenaVisible ? <IconoOjoTachado /> : <IconoOjo />}
              {contrasenaVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            </BotonEnLinea>
            <BotonEnLinea onClick={generar} aria-controls={ids.password}>
              <IconoSincronizar />
              Generar una segura
            </BotonEnLinea>
          </div>
          <p className="sr-only" aria-live="polite">
            {estadoContrasena}
          </p>
        </div>

        {errores.general ? (
          <p className={estilos.errorGeneral} role="alert">
            {errores.general}
          </p>
        ) : null}

        <div className={estilos.acciones}>
          <BotonPrimario
            type="submit"
            aria-disabled={crear.isPending || undefined}
          >
            {crear.isPending ? 'Creando cuenta…' : 'Crear cuenta'}
          </BotonPrimario>
        </div>
      </form>
    </section>
  );
}
