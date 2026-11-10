import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { servidor } from './servidor';

// Una petición sin handler es un error del test, no algo que ignorar.
// (En MSW 3 la opción se llama `onUnhandledFrame`; antes, `onUnhandledRequest`.)
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));

afterEach(() => {
  cleanup();
  servidor.resetHandlers();
  sessionStorage.clear();
  // La búsqueda se guarda en la URL: cada test parte de una URL limpia.
  window.history.replaceState(null, '', '/');
});

afterAll(() => servidor.close());

// jsdom no implementa canvas y axe-core lo consulta: se responde "sin soporte"
// en vez de llenar la salida de avisos "Not implemented".
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => null,
});

// jsdom tampoco desplaza la página: al navegar, `scrollTo` no hace nada.
window.scrollTo = () => {};

// jsdom no implementa `showModal()` ni `close()` de <dialog>: basta con el
// atributo `open` (lo que lo hace visible) y el evento `close`. El encierro
// del foco y el fondo inerte los prueba el e2e en un navegador real.
HTMLDialogElement.prototype.showModal = function showModal(
  this: HTMLDialogElement,
) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  if (this.hasAttribute('open')) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  }
};
