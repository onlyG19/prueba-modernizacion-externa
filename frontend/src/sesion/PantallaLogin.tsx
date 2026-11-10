import { useActionState } from 'react';
import { ApiError, ErrorDeConexion, urlApi } from '../api/cliente';
import { cargarConsola } from '../consola/cargar-consola';
import { Enlace } from '../rutas/Enlace';
import { RUTAS } from '../rutas/rutas';
import { BotonPrimario } from '../ui/botones';
import { IlustracionCredencial } from './IlustracionCredencial';
import estilos from './PantallaLogin.module.css';
import { useSesion, type MotivoCierre } from './sesion-contexto';

interface EstadoLogin {
  error: string | null;
  /**
   * React 19 reinicia el formulario al terminar la acción: el usuario escrito
   * se devuelve aquí y se usa como `defaultValue`, para no borrarlo tras un
   * intento fallido.
   */
  username: string;
}

const INICIAL: EstadoLogin = { error: null, username: '' };

function mensajeDeLogin(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) {
    return 'Usuario o contraseña incorrectos. Revísalos e inténtalo de nuevo.';
  }
  if (error instanceof ApiError && error.status === 429) {
    return 'Demasiados intentos de ingreso. Espera un minuto e inténtalo de nuevo.';
  }
  if (error instanceof ApiError && error.status === 400) {
    return 'Escribe tu usuario y tu contraseña.';
  }
  if (error instanceof ErrorDeConexion) {
    return 'No se pudo conectar con el servidor. Revisa que la API esté en ejecución e inténtalo de nuevo.';
  }
  return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
}

/** Por qué se está en el login otra vez, dicho a la persona. */
const AVISO_CIERRE: Record<MotivoCierre, string> = {
  expirada: 'Tu sesión expiró. Ingresa de nuevo para continuar.',
  manual: 'Cerraste sesión. Vuelve cuando quieras.',
};

export function PantallaLogin() {
  const { state, actions } = useSesion();

  const [estado, ingresar, ingresando] = useActionState<EstadoLogin, FormData>(
    async (_anterior, datos) => {
      const username = String(datos.get('username') ?? '').trim();
      const password = String(datos.get('password') ?? '');
      if (!username || !password) {
        return { error: 'Escribe tu usuario y tu contraseña.', username };
      }
      try {
        await actions.iniciarSesion({ username, password });
        return { error: null, username };
      } catch (error) {
        return { error: mensajeDeLogin(error), username };
      }
    },
    INICIAL,
  );

  // [ANTES] const sesionExpirada = state.motivoCierre === 'expirada';
  const aviso = state.motivoCierre ? AVISO_CIERRE[state.motivoCierre] : null;

  return (
    <main className={estilos.pagina}>
      <title>Ingresar – Consola de usuarios</title>
      {/* La marca a un lado y el formulario al otro, como el acceso de uno.cl. */}
      <div className={estilos.marca}>
        <p className={estilos.lema}>
          Tu registro de usuarios, <span>claro y en orden.</span>
        </p>
        <IlustracionCredencial />
      </div>

      <div className={estilos.columna}>
        <Enlace href={RUTAS.inicio} className={estilos.volver}>
          Volver al inicio
        </Enlace>
        <img
          className={estilos.logo}
          src={urlApi('/logo')}
          alt="Uno"
          width={134}
          height={56}
          fetchPriority="high"
        />
        <h1 className={estilos.titulo}>Consola de usuarios</h1>
        <p className={estilos.bajada}>
          Ingresa con la cuenta de administración para gestionar el registro de
          usuarios.
        </p>

        {/* [ANTES] {sesionExpirada ? ( */}
        {/* [ANTES]   <p className={estilos.aviso} role="status">Tu sesión expiró. Ingresa de nuevo para continuar.</p> */}
        {/* [ANTES] ) : null} */}
        {aviso ? (
          <p className={estilos.aviso} role="status">
            {aviso}
          </p>
        ) : null}

        <form
          className={estilos.formulario}
          action={ingresar}
          // Al empezar a escribir se precarga la consola: el ingreso se siente
          // instantáneo.
          onFocus={() => void cargarConsola()}
          noValidate
        >
          <div className={estilos.campo}>
            <label htmlFor="login-usuario">Usuario</label>
            <input
              id="login-usuario"
              name="username"
              className={estilos.entrada}
              defaultValue={estado.username}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              aria-invalid={estado.error ? true : undefined}
              aria-describedby={estado.error ? 'login-error' : undefined}
            />
          </div>
          <div className={estilos.campo}>
            <label htmlFor="login-contrasena">Contraseña</label>
            <input
              id="login-contrasena"
              name="password"
              type="password"
              className={estilos.entrada}
              autoComplete="current-password"
              required
              aria-invalid={estado.error ? true : undefined}
              aria-describedby={estado.error ? 'login-error' : undefined}
            />
          </div>

          {estado.error ? (
            <p id="login-error" className={estilos.error} role="alert">
              {estado.error}
            </p>
          ) : null}

          <BotonPrimario
            type="submit"
            className={estilos.ingresar}
            aria-disabled={ingresando || undefined}
          >
            {ingresando ? 'Ingresando…' : 'Ingresar'}
          </BotonPrimario>
        </form>
      </div>
    </main>
  );
}
