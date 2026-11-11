# Presentación: modernización del registro de usuarios

Diapositivas en Astro que explican qué se encontró en el código de la prueba, qué se cambió y por qué. Usan la misma marca que la app (paleta de Uno y Montserrat).

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # sitio estático en dist/
pnpm preview    # sirve dist/
pnpm diagramas  # vuelve a generar los diagramas desde el README del proyecto
```

## Al presentar

| Tecla | Acción |
| --- | --- |
| → ↓ Av Pág, espacio | Siguiente |
| ← ↑ Re Pág | Anterior |
| Inicio / Fin | Primera / última |
| F | Pantalla completa |
| Z | Ampliar el diagrama de la diapositiva actual |

La diapositiva actual queda en la URL (`#5`), así que se puede enlazar o recargar sin perder el lugar. En pantallas táctiles se avanza deslizando, y los controles aparecen al acercar el mouse a la esquina inferior derecha.

### Diagramas del README

Los diagramas que pide la prueba (punto 1, arquitectura; punto 2, flujos) van cada uno después de la diapositiva de su tema. Un clic o la tecla Z los abre a pantalla completa, con letra legible:

| En el visor | Acción |
| --- | --- |
| Arrastrar, rueda o flechas | Recorrer |
| Ctrl + rueda, + / − | Zoom |
| 0 | Volver al tamaño inicial |
| Esc | Cerrar |

## PDF

Imprimir desde el navegador (Ctrl+P → Guardar como PDF) da 21 páginas de 1600 × 900, una por diapositiva, con los fondos incluidos. Los diagramas son vectoriales: en el PDF se puede hacer zoom sin que pierdan nitidez.

## Cómo está hecha

- `src/pages/index.astro`: las 21 diapositivas, en orden.
- `src/components/`: la diapositiva base, los diagramas explicativos (arquitectura, recorrido de una petición y concurrencia, en HTML y CSS), la diapositiva de un diagrama del README y su visor.
- `src/diagramas/`: los diagramas Mermaid del README del proyecto, en SVG. Los genera `scripts/diagramas.mjs`: Playwright abre Chromium con Montserrat cargada y Mermaid dibuja cada uno, así que el texto se mide con la misma fuente con la que se muestra. No se editan a mano: si cambia el README, `pnpm diagramas`.
- `src/styles/global.css`: tokens de la marca. Las medidas van en `cqw` (centésimas del ancho de la diapositiva), así que se ve igual en un portátil, un proyector o el PDF, sin JavaScript que la escale.
- `public/capturas/`: capturas de la app con usuarios de demostración del seed.

Las cifras (tests, commits, mejoras) son las del repositorio al 10 de noviembre de 2026; el detalle está en `docs/MEJORAS.md`.
