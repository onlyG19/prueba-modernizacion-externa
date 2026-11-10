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
docker compose up -d postgres redis   # solo la infraestructura
pnpm migration:run
pnpm start:dev                        # API en http://localhost:3000
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

### Con Docker (stack completo)

Desde la raíz: `docker compose up -d --build` y abre http://localhost:8080.
nginx sirve el build de producción y redirige `/api/*` a la API, con
cabeceras de seguridad (CSP estricta, `nosniff`, `frame-ancestors 'none'`).
La configuración está en `frontend/nginx/`.

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
├── rutas/        enrutador mínimo (History API), enlaces y reglas de redirección
├── inicio/       sitio público: portada, validador de RUT en vivo, indicadores, 404
├── sesion/       login, contexto de sesión y almacenamiento versionado
├── consola/      el panel (cargado bajo demanda): encabezado, barra lateral, resumen
├── usuarios/     página con pestañas, tabla, ventana de detalle, registro, RUT
│   ├── formulario/   piezas compuestas + variantes crear / editar
│   └── rut/          formato y verificación mientras se escribe
├── cuentas/      crear cuentas (solo el admin): formulario, reglas y generador de contraseñas
├── ui/           botones, ventana modal (<dialog>), avisos, íconos, estilos de formulario
├── estilos/      tokens de diseño y estilos base
└── test/         API falsa (MSW), utilidades de render y de accesibilidad
```

Rutas:

| Ruta | Página | Sesión |
| --- | --- | --- |
| `/` | Sitio de inicio | Pública |
| `/ingresar` | Login (con sesión, redirige al panel) | Pública |
| `/panel` | Resumen: cifras, últimos registrados y accesos | Requerida |
| `/panel/usuarios` | Tabla de usuarios; el ojo abre el detalle y el lápiz, la edición | Requerida |
| `/panel/usuarios/registrar` | Registrar usuario | Requerida |
| `/panel/cuentas` | Crear cuentas para otras personas | Requerida; solo el admin la ve en la barra lateral |

Sin sesión, una ruta del panel lleva al login con `?volver=` y, tras ingresar,
vuelve a esa página (solo se aceptan rutas del panel: sin redirección abierta).
`nginx` y Vite ya devuelven `index.html` en cualquier ruta, así que recargar o
abrir un enlace directo funciona.

Decisiones principales:

- **La regla del RUT se escribe una sola vez.** El alias `@dominio` apunta a
  `src/modules/usuarios/domain` del backend: el frontend usa la misma clase
  `Rut` (módulo 11) y la misma constante de largo del nombre que la API. Con
  `@dominio-cuentas` pasa lo mismo con el largo y los caracteres permitidos del
  usuario y el largo de la contraseña.
- **El rol adapta la interfaz; la API decide.** El login devuelve el rol y la
  sesión lo guarda: un operador no ve "Cuentas" en la barra lateral y, si llega
  por la URL, se le explica que la sección es del administrador. La barrera real
  es la API, que responde 403 a un token que no sea de admin.
- **Tipos de extremo a extremo.** `esquema.d.ts` se genera desde el documento
  OpenAPI de la API: si un contrato cambia y no se regenera, el frontend no
  compila.
- **Datos del servidor con TanStack Query**: caché, deduplicación y estados de
  carga/error. Tras cada mutación se invalida la lista (con paginación, un
  cambio puede mover a alguien de página) y el detalle abierto se actualiza con
  la respuesta. Un 401 en cualquier consulta cierra la sesión.
- **La consola se carga bajo demanda** (`lazy`): quien no ha iniciado sesión no
  descarga ese código, y se precarga al enfocar el formulario de login.
- **Enrutador propio en vez de una librería**: son seis rutas fijas.
  `useSyncExternalStore` lee la URL (un sistema externo a React) y `navegar()`
  usa `pushState`; los enlaces siguen siendo `<a>` reales (abren en otra pestaña
  con Ctrl/⌘). Al cambiar de página el foco va a su título, salvo en las
  pestañas, donde se queda en la pestaña elegida.
- **Ventana modal con `<dialog>` nativo** (`showModal()`): el navegador encierra
  el foco y deja inerte el fondo, sin librerías. El detalle se abre al instante
  con los datos de la fila y se completa con `GET /usuarios/:id`.
- **Sesión en `sessionStorage`** con clave versionada: sobrevive a recargar la
  pestaña y se borra al cerrarla. Un JWT en el navegador es legible ante un XSS;
  la alternativa robusta (cookie `httpOnly`) requiere cambiar el backend.
- **Composición en vez de props booleanas**: `FormularioCrearUsuario` y
  `FormularioEditarUsuario` arman las mismas piezas (`partes.tsx`) sobre un
  contrato de contexto común.

## Diseño y accesibilidad

- Diseño basado en la marca y la estructura de uno.cl: portada con el
  degradado magenta, títulos en dos tonos, tarjetas con barra de color, banda
  morada y pie gris de ayuda. En vez de un carrusel, la portada trae un
  validador de RUT en vivo (el mismo `Rut` del dominio).
- Paleta de la marca (cian, magenta, morado). Los colores que no alcanzan AA
  para texto chico solo decoran o van en texto grande; el cian de la acción se
  oscureció hasta cumplir AA en todas las superficies (verificado también en
  navegador real con axe-core). Los tokens están en `estilos/tokens.css`.
- Montserrat (la tipografía de la marca) en versión variable, servida desde el
  build (sin CDN externo), con cifras tabulares para los RUT.
- El campo RUT formatea mientras se escribe, conserva el cursor al editar en
  medio y confirma el dígito verificador al instante; el error aparece al salir
  del campo o al enviar.
- Teclado completo: foco visible, enlace para saltar al contenido, Escape para
  cerrar la ventana o cancelar la eliminación, y el foco vuelve al botón que la
  abrió.
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
