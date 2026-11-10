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
