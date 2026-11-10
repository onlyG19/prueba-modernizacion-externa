import type { Page } from '@playwright/test';
import type axe from 'axe-core';

declare global {
  interface Window {
    axe: typeof axe;
  }
}

/** Corre axe-core dentro del navegador real: aquí sí se mide el contraste. */
export async function violacionesDeAccesibilidad(pagina: Page) {
  // Se mide el estado final: a mitad de una animación de entrada (opacidad
  // parcial) el contraste sale más bajo de lo que de verdad se ve.
  await pagina.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished)),
  );
  await pagina.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  return pagina.evaluate(async () =>
    (await window.axe.run()).violations.map(
      (v) => `${v.id}: ${v.help} (${v.nodes.length})`,
    ),
  );
}
