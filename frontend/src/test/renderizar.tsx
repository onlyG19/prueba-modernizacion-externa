import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { RUTAS } from '../rutas/rutas';
import { guardarSesion } from '../sesion/almacen-sesion';
import { SesionProvider } from '../sesion/SesionProvider';
import { Avisos } from '../ui/Avisos';
import { TOKEN_PRUEBA } from './api-falsa';

// [ANTES] function renderizarApp() {
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

// [ANTES] /** La app tal como la ve alguien que no ha iniciado sesión. */
// [ANTES] export function renderizarSinSesion() {
// [ANTES]   return renderizarApp();
// [ANTES] }
/** La app tal como la ve alguien que no ha iniciado sesión (por defecto, en el login). */
export function renderizarSinSesion(ruta: string = RUTAS.ingresar) {
  return renderizarApp(ruta);
}

// [ANTES] /** La app con una sesión vigente ya guardada (como tras recargar la pestaña). */
// [ANTES] export function renderizarConSesion() {
/**
 * La app con una sesión vigente ya guardada (como tras recargar la pestaña),
 * por defecto en la tabla de usuarios.
 */
export function renderizarConSesion(ruta: string = RUTAS.usuarios) {
  guardarSesion({
    token: TOKEN_PRUEBA,
    usuario: 'admin',
    expiraEn: Date.now() + 60 * 60 * 1000,
  });
  // [ANTES] return renderizarApp();
  return renderizarApp(ruta);
}
