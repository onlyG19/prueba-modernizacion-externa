import { setupServer } from 'msw/node';

/** Intercepta `fetch` en los tests; cada test registra su API falsa con `use()`. */
export const servidor = setupServer();
