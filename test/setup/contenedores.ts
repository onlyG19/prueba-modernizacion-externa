import type { StartedTestContainer } from 'testcontainers';

/**
 * Lo que el setup global de Jest deja para el teardown global: ambos corren en
 * el mismo contexto, distinto del de los tests.
 */
type GlobalE2e = typeof globalThis & {
  contenedoresE2e?: StartedTestContainer[];
};

export function guardarContenedores(contenedores: StartedTestContainer[]) {
  (globalThis as GlobalE2e).contenedoresE2e = contenedores;
}

export function contenedoresGuardados(): StartedTestContainer[] {
  return (globalThis as GlobalE2e).contenedoresE2e ?? [];
}
