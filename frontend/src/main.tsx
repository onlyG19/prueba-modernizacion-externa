// Fuente servida desde el propio build: sin pedir nada a un CDN externo ni
// filtrarle la IP de quien visita. Montserrat, la tipografía de la marca Uno,
// en versión variable: un solo archivo (subconjunto latino, ~38 KB) trae
// todos los pesos; el navegador baja solo el subconjunto que usa la página.
import '@fontsource-variable/montserrat/wght.css';
import './estilos/tokens.css';
import './estilos/base.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorInesperado } from './ErrorInesperado';
import { SesionProvider } from './sesion/SesionProvider';
import { Avisos } from './ui/Avisos';

const raiz = document.getElementById('root');
if (!raiz) {
  throw new Error('No se encontró el elemento #root en index.html');
}

createRoot(raiz).render(
  <StrictMode>
    <ErrorInesperado>
      <SesionProvider>
        <Avisos>
          <App />
        </Avisos>
      </SesionProvider>
    </ErrorInesperado>
  </StrictMode>,
);
