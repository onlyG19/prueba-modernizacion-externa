import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Rol } from '../api/tipos';
import { App } from '../App';
import { RUTAS } from '../rutas/rutas';
import { guardarSesion } from '../sesion/almacen-sesion';
import { SesionProvider } from '../sesion/SesionProvider';
import { Avisos } from '../ui/Avisos';
import {
  CREDENCIALES_OPERADOR,
  TOKEN_OPERADOR,
  TOKEN_PRUEBA,
} from './api-falsa';

/** La app completa, abierta en `ruta` (puede traer query: `/panel/usuarios?buscar=x`). */
function renderizarApp(ruta: string) {
  window.history.replaceState(null, '', ruta);
  const usuario = userEvent.setup();
  const resultado = render(
    <SesionProvider>
      <Avisos>
        <App />
      </Avisos>
    </SesionProvider>,
  );
  return { usuario, ...resultado };
}

/** La app tal como la ve alguien que no ha iniciado sesión (por defecto, en el login). */
export function renderizarSinSesion(ruta: string = RUTAS.ingresar) {
  return renderizarApp(ruta);
}

/**
 * La app con una sesión vigente ya guardada (como tras recargar la pestaña),
 * por defecto la del administrador y en la tabla de usuarios.
 */
export function renderizarConSesion(
  ruta: string = RUTAS.usuarios,
  rol: Rol = 'admin',
) {
  guardarSesion(
    rol === 'admin'
      ? {
          token: TOKEN_PRUEBA,
          usuario: 'admin',
          rol,
          expiraEn: Date.now() + 60 * 60 * 1000,
        }
      : {
          token: TOKEN_OPERADOR,
          usuario: CREDENCIALES_OPERADOR.username,
          rol,
          expiraEn: Date.now() + 60 * 60 * 1000,
        },
  );
  return renderizarApp(ruta);
}
