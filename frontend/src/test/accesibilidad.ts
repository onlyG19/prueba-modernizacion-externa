import axe from 'axe-core';

/**
 * Corre axe-core (versión fijada) sobre el DOM y devuelve las violaciones
 * WCAG encontradas, en un formato legible para el mensaje del test.
 *
 * @remarks El contraste de color se desactiva porque jsdom no calcula estilos
 * ni layout; la paleta se verificó aparte (ver `estilos/tokens.css`).
 */
export async function violacionesDeAccesibilidad(
  contenedor: Element = document.body,
): Promise<string[]> {
  const { violations } = await axe.run(contenedor, {
    rules: { 'color-contrast': { enabled: false } },
  });
  return violations.map(
    (v) =>
      `${v.id} (${v.impact ?? 'sin impacto'}): ${v.help} — ${v.nodes.length} nodo(s)`,
  );
}
