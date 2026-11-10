# Consola de usuarios (frontend)

Consola interna para gestionar el registro de usuarios y sus RUT: inicio de
sesión, listado con búsqueda, alta, edición y baja, y el logo con su contador
de visitas. Consume la API NestJS de la raíz del repositorio.

**Stack:** React 19 · Vite 8 · TypeScript 6 · TanStack Query 5 · CSS Modules ·
Vitest + Testing Library + MSW + axe-core · Playwright.

## Cómo correrlo

Requisitos: la API y su infraestructura en ejecución (ver el README de la raíz):

```bash
# en la raíz del repositorio
docker compose up -d
pnpm migration:run
pnpm start:dev          # API en http://localhost:3000
```

Luego, en `frontend/`:

```bash
pnpm install
pnpm dev                # http://localhost:5173
```

Ingresa con `AUTH_USER` y la contraseña cuyo hash está en `AUTH_PASSWORD_HASH`
(`.env` de la raíz; se genera con `pnpm auth:hash-password <contraseña>`).

En desarrollo, Vite redirige `/api/*` a la API (`API_PROXY_TARGET`, por defecto
`http://localhost:3000`): el navegador ve un solo origen y no hay CORS. En
producción, `VITE_API_URL` define la URL base de la API.

## Scripts

| Script | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Verificación de tipos y build de producción |
| `pnpm test` | Tests unitarios y de integración (Vitest) |
| `pnpm test:e2e` | Tests end-to-end con navegador real (Playwright) |
| `pnpm lint` | oxlint |
| `pnpm typecheck` | TypeScript (app, configuración y e2e) |
| `pnpm format` | Prettier, con la misma configuración del backend |
| `pnpm gen:api` | Regenera `src/api/esquema.d.ts` desde `/docs-json` de la API |

## Arquitectura

```
src/
├── api/          cliente HTTP (errores tipados) y tipos generados desde OpenAPI
├── sesion/       login, contexto de sesión y almacenamiento versionado
├── consola/      la consola (cargada bajo demanda), encabezado y logo
├── usuarios/     lista, filas, formularios y el campo RUT
│   ├── formulario/   piezas compuestas + variantes crear / editar
│   └── rut/          formato y verificación mientras se escribe
├── ui/           botones, avisos (región viva), íconos
├── estilos/      tokens de diseño y estilos base
└── test/         API falsa (MSW), utilidades de render y de accesibilidad
```

Decisiones principales:

- **La regla del RUT se escribe una sola vez.** El alias `@dominio` apunta a
  `src/modules/usuarios/domain` del backend: el frontend usa la misma clase
  `Rut` (módulo 11) y la misma constante de largo del nombre que la API.
- **Tipos de extremo a extremo.** `esquema.d.ts` se genera desde el documento
  OpenAPI de la API: si un contrato cambia y no se regenera, el frontend no
  compila.
- **Datos del servidor con TanStack Query**: caché, deduplicación y estados de
  carga/error. Las mutaciones actualizan la caché con la respuesta, sin volver
  a pedir la lista. Un 401 en cualquier consulta cierra la sesión.
- **La consola se carga bajo demanda** (`lazy`): quien no ha iniciado sesión no
  descarga ese código, y se precarga al enfocar el formulario de login.
- **Sesión en `sessionStorage`** con clave versionada: sobrevive a recargar la
  pestaña y se borra al cerrarla. Un JWT en el navegador es legible ante un XSS;
  la alternativa robusta (cookie `httpOnly`) requiere cambiar el backend.
- **Composición en vez de props booleanas**: `FormularioCrearUsuario` y
  `FormularioEditarUsuario` arman las mismas piezas (`partes.tsx`) sobre un
  contrato de contexto común; `FilaUsuario.Normal` y `FilaUsuario.EnEdicion`.

## Diseño y accesibilidad

- Paleta inspirada en la cédula de identidad (donde vive el RUT) y en el cian
  de la marca; todos los pares de color cumplen WCAG AA (verificados, también
  en navegador real con axe-core). Los tokens están en `estilos/tokens.css`.
- IBM Plex Sans servida desde el build (sin CDN externo), con cifras tabulares
  para los RUT.
- El campo RUT formatea mientras se escribe, conserva el cursor al editar en
  medio y confirma el dígito verificador al instante; el error aparece al salir
  del campo o al enviar.
- Teclado completo: foco visible, enlace para saltar al contenido, Escape para
  cancelar la edición o la eliminación, y el foco vuelve a donde estaba.
- Avisos y errores en regiones vivas para lectores de pantalla; movimiento solo
  en respuesta a acciones y desactivado con `prefers-reduced-motion`.

## Tests

- **Vitest + Testing Library + MSW** (`pnpm test`): la app completa contra una
  API falsa en memoria que replica las reglas del backend (token, 409 por RUT
  duplicado, 204 al eliminar), más tests unitarios de la lógica del RUT y de la
  sesión, y auditoría de accesibilidad con axe-core.
- **Playwright** (`pnpm test:e2e`): navegador real contra el frontend, la API,
  Postgres y Redis. Usa una base de datos exclusiva (`prueba_modernizacion_e2e`)
  que crea, migra y vacía en cada corrida; tus datos de desarrollo no se tocan.
  Requiere Postgres y Redis en ejecución y el navegador de Playwright
  (`pnpm exec playwright install chromium --only-shell`). Compila el backend en
  `dist/`.
