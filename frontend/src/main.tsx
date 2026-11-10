// Fuente servida desde el propio build (subconjunto latino: incluye á, é, ñ):
// sin pedir nada a un CDN externo ni filtrarle la IP de quien visita.
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
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
