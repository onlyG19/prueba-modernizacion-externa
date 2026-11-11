/**
 * Convierte los diagramas Mermaid del README del proyecto en SVG para la
 * presentación (`pnpm diagramas`). El README es la única fuente: si un
 * diagrama cambia allá, se vuelve a correr este script.
 *
 * Mermaid dibuja cada diagrama en Chromium (Playwright) con Montserrat ya
 * cargada: el texto se mide con la misma fuente con la que se muestra, así
 * que ninguna etiqueta queda cortada o desbordada.
 */
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const README = join(RAIZ, '..', 'README.md');
const SALIDA = join(RAIZ, 'src', 'diagramas');
const MODULOS = join(RAIZ, 'node_modules');

/** Un origen ficticio: Playwright lo sirve desde node_modules (ver `route`). */
const ORIGEN = 'http://diagramas.local';
const ARCHIVOS = {
  '/mermaid.min.js': join(MODULOS, 'mermaid/dist/mermaid.min.js'),
  '/montserrat.woff2': join(
    MODULOS,
    '@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2',
  ),
};

/** La paleta de la presentación (src/styles/global.css). */
const TEMA = {
  fontFamily: '"Montserrat Variable", sans-serif',
  fontSize: '16px',
  background: '#ffffff',
  primaryColor: '#f3ebf5',
  primaryBorderColor: '#784685',
  primaryTextColor: '#242424',
  secondaryColor: '#e6f6fc',
  tertiaryColor: '#ffffff',
  lineColor: '#5c5c66',
  textColor: '#242424',
  clusterBkg: '#f6f4f8',
  clusterBorder: '#c9b5cf',
  edgeLabelBackground: '#ffffff',
  actorBkg: '#784685',
  actorBorder: '#784685',
  actorTextColor: '#ffffff',
  actorLineColor: '#c9b5cf',
  signalColor: '#242424',
  signalTextColor: '#242424',
  labelBoxBkgColor: '#f3ebf5',
  labelBoxBorderColor: '#784685',
  labelTextColor: '#242424',
  loopTextColor: '#242424',
  noteBkgColor: '#fef6d6',
  noteBorderColor: '#fcd75a',
  noteTextColor: '#242424',
  activationBkgColor: '#f3ebf5',
  activationBorderColor: '#784685',
};

/**
 * Ajustes sobre los estilos de Mermaid:
 * - Un halo blanco alrededor del texto que va sobre líneas (etiquetas de las
 *   flechas, mensajes y bloques alt): la línea que pasa por detrás ya no lo
 *   tacha. El fondo que trae Mermaid queda corrido respecto del texto.
 * - El nombre del actor (la figura de palito) va bajo la figura, sobre blanco:
 *   con el color de los participantes (blanco sobre morado) no se veía.
 */
const CSS_EXTRA = `
  .edgeLabel text, .messageText, .loopText, .loopText > tspan {
    paint-order: stroke fill;
    stroke: #ffffff;
    stroke-width: 6px;
    stroke-linejoin: round;
  }
  .edgeLabel rect { opacity: 0; }
  text.actor.actor-man, text.actor.actor-man > tspan { fill: #242424; }
`;

/** Los bloques ```mermaid del README, con el título bajo el que están. */
function extraerDiagramas(markdown) {
  const lineas = markdown.split('\n');
  const diagramas = [];
  let encabezado = null;
  for (let i = 0; i < lineas.length; i++) {
    const titulo = lineas[i].match(/^#{2,3}\s+(.+)$/);
    if (titulo) {
      encabezado = titulo[1].trim();
    } else if (lineas[i].trim() === '```mermaid') {
      const codigo = [];
      for (i++; lineas[i].trim() !== '```'; i++) {
        codigo.push(lineas[i]);
      }
      // "2.1 Una petición a la API" → numero "2.1", titulo "Una petición…"
      const [, numero, titulo] = encabezado.match(/^(\d+(?:\.\d+)*)\.?\s+(.+)$/);
      diagramas.push({ numero, titulo, codigo: codigo.join('\n') });
    }
  }
  return diagramas;
}

/**
 * Cada diagrama vive en la misma página que los demás: sus ids llevan el
 * prefijo del diagrama. Si no, un marcador de flecha (`url(#arrowhead)`)
 * apuntaría al de otro diagrama, oculto en otra diapositiva, y no se vería.
 */
function prefijarIds(svg, prefijo) {
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)]
    .map(([, id]) => id)
    .filter((id) => !id.startsWith(prefijo));
  let resultado = svg;
  for (const id of new Set(ids)) {
    const nuevo = `${prefijo}-${id}`;
    const escapado = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    resultado = resultado
      .replace(new RegExp(`id="${escapado}"`, 'g'), `id="${nuevo}"`)
      .replace(new RegExp(`url\\(#${escapado}\\)`, 'g'), `url(#${nuevo})`)
      .replace(new RegExp(`href="#${escapado}"`, 'g'), `href="#${nuevo}"`);
  }
  return resultado;
}

/** Sin ancho fijo: la diapositiva decide el tamaño, el viewBox la proporción. */
function sinTamanoFijo(svg) {
  return svg.replace(/^<svg([^>]*)>/, (_, atributos) => {
    const limpios = atributos
      .replace(/\swidth="[^"]*"/, '')
      .replace(/\sheight="[^"]*"/, '')
      .replace(/\sstyle="[^"]*"/, '');
    return `<svg${limpios}>`;
  });
}

const diagramas = extraerDiagramas(await readFile(README, 'utf8'));
if (diagramas.length === 0) {
  throw new Error(`No hay bloques mermaid en ${README}`);
}

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
await pagina.route(`${ORIGEN}/**`, async (ruta) => {
  const { pathname } = new URL(ruta.request().url());
  if (pathname === '/') {
    return ruta.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><meta charset="utf-8"><style>
        @font-face { font-family: 'Montserrat Variable'; font-weight: 100 900;
          src: url('/montserrat.woff2') format('woff2'); }
        body { font-family: 'Montserrat Variable'; }
      </style><script src="/mermaid.min.js"></script>`,
    });
  }
  const archivo = ARCHIVOS[pathname];
  return archivo ? ruta.fulfill({ path: archivo }) : ruta.abort();
});
await pagina.goto(`${ORIGEN}/`);
await pagina.evaluate(async () => {
  // La fuente tiene que estar lista antes de medir el texto.
  await document.fonts.load('16px "Montserrat Variable"');
  await document.fonts.load('bold 16px "Montserrat Variable"');
});

// Se sobrescribe en vez de borrar la carpeta: si se borra, `astro dev` deja
// de vigilarla y sigue mostrando los diagramas viejos.
await mkdir(SALIDA, { recursive: true });
const indice = [];
for (const { numero, titulo, codigo } of diagramas) {
  const id = `diagrama-${numero.replaceAll('.', '-')}`;
  const { svg, ancho, alto } = await pagina.evaluate(
    async ({ id, codigo, tema, css }) => {
      const { mermaid } = window;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: tema,
        // Texto SVG y no HTML: no hereda estilos de la página y se imprime igual.
        htmlLabels: false,
        // Las líneas se cortan solo donde el README pone <br/>, como en GitHub;
        // si no, Mermaid parte palabras a los 200 px ("X-Request-Co unt").
        markdownAutoWrap: false,
        flowchart: { htmlLabels: false, padding: 14, wrappingWidth: 1000 },
        sequence: { mirrorActors: false },
        themeCSS: css,
      });
      const { svg } = await mermaid.render(id, codigo);
      const caja = new DOMParser()
        .parseFromString(svg, 'image/svg+xml')
        .documentElement.getAttribute('viewBox')
        .split(/\s+/)
        .map(Number);
      return { svg, ancho: caja[2], alto: caja[3] };
    },
    { id, codigo, tema: TEMA, css: CSS_EXTRA },
  );
  const archivo = `${id}.svg`;
  await writeFile(join(SALIDA, archivo), sinTamanoFijo(prefijarIds(svg, id)));
  indice.push({ numero, titulo, archivo, ancho: Math.round(ancho), alto: Math.round(alto) });
  console.log(`${numero} ${titulo}: ${Math.round(ancho)} × ${Math.round(alto)}`);
}
await writeFile(join(SALIDA, 'diagramas.json'), `${JSON.stringify(indice, null, 2)}\n`);
await navegador.close();

// Un diagrama que ya no está en el README sale también de la presentación.
const vigentes = new Set(indice.map((d) => d.archivo));
for (const archivo of await readdir(SALIDA)) {
  if (archivo.endsWith('.svg') && !vigentes.has(archivo)) {
    await rm(join(SALIDA, archivo));
  }
}
