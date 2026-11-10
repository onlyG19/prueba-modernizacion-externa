import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { guardarSesion } from '../sesion/almacen-sesion';
import { SesionProvider } from '../sesion/SesionProvider';
import { Avisos } from '../ui/Avisos';
import { TOKEN_PRUEBA } from './api-falsa';

function renderizarApp() {
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

/** La app tal como la ve alguien que no ha iniciado sesión. */
export function renderizarSinSesion() {
  return renderizarApp();
}

/** La app con una sesión vigente ya guardada (como tras recargar la pestaña). */
export function renderizarConSesion() {
  guardarSesion({
    token: TOKEN_PRUEBA,
    usuario: 'admin',
    expiraEn: Date.now() + 60 * 60 * 1000,
  });
  return renderizarApp();
}
