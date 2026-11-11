import { defineConfig } from 'astro/config';

// Sitio estático de una sola página: la presentación se abre sin servidor.
export default defineConfig({
  devToolbar: { enabled: false },
});
