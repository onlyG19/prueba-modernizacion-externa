# Mejoras

Respuesta al punto 3 de la prueba: 47 mejoras hechas y 13 pendientes. Las tareas marcadas llevan los commits donde se ve el cambio (`git show <hash>`). Las que no están marcadas son lo que haría a continuación.

Punto de partida, en la revisión del 9 de noviembre de 2026: los 27 tests unitarios pasaban, el lint fallaba con 22 errores, la API no tenía autenticación y no había frontend. Se priorizó por riesgo: primero los datos y la seguridad, después la operación, la calidad y el producto.

## Datos y dominio

- [x] **Validar el dígito verificador del RUT.** `8773446` `2b74274` `d03d260`
  - **Qué:** value object `Rut` con el algoritmo módulo 11 y un decorador `@IsRut()` en el DTO. Los tests usaban un RUT inválido (`12345678-9`; el correcto es `12345678-5`) y se corrigieron.
  - **Por qué:** solo se validaba el formato, así que se guardaban RUT que no existen.
- [x] **RUT único y en una sola forma.** `460d86e` `13e9b2b`
  - **Qué:** el RUT se guarda normalizado (`12345678-K`, sin puntos) y con índice `UNIQUE`. Un duplicado responde 409.
  - **Por qué:** `12.345.678-k` y `12345678-K` quedaban como dos personas distintas, y un duplicado terminaba en un 500.
- [x] **Una sola fuente para el largo de los campos.** `2b74274` `460d86e`
  - **Qué:** constantes compartidas por la entidad y el DTO (`RUT_MAX_LENGTH`, `NOMBRE_MAX_LENGTH`).
  - **Por qué:** la columna admitía 12 caracteres y la validación 10; eran dos reglas que ya no coincidían.
- [x] **Migraciones en vez de `synchronize`.** `5e7787f` `063e775`
  - **Qué:** migraciones de TypeORM versionadas y `synchronize` siempre apagado. La base existente se adoptó como punto de partida, sin perder datos.
  - **Por qué:** `synchronize` quedaba activo si faltaba `NODE_ENV`, y en producción altera tablas al arrancar. Al probarlo, proponía borrar la columna `rut`.
- [x] **Fechas de registro y de último cambio.** `9d5dc98`
  - **Qué:** columnas `creadoEn` y `actualizadoEn` (`timestamptz`), con su migración.
  - **Por qué:** no había forma de saber cuándo se creó o se modificó un usuario.
- [x] **Ids públicos UUID.** `7c9c6ac`
  - **Qué:** clave primaria UUID (`gen_random_uuid()`) y validación del id en la ruta (`ParseUUIDPipe`).
  - **Por qué:** con ids correlativos se recorren todos los usuarios probando 1, 2, 3…, y se sabe cuántos hay.
- [x] **Datos de demostración con RUT válidos.** `73e8a8d`
  - **Qué:** `pnpm seed`, determinista e idempotente: nombres frecuentes en Chile y RUT con el dígito calculado por el mismo `Rut`. En producción no corre sin `--forzar`.
  - **Por qué:** la búsqueda, el orden y la paginación solo se pueden probar con datos realistas, y cargarlos a mano es lento.

## Seguridad y datos personales

- [x] **Autenticación con JWT.** `0d56fe2` `4c8ef3f`
  - **Qué:** `POST /auth/login` entrega un JWT y un guard global protege todas las rutas, salvo las marcadas con `@Public()`. La contraseña del administrador se guarda como hash scrypt.
  - **Por qué:** cualquiera podía listar, editar o borrar usuarios, y el RUT es un dato personal (Ley 19.628).
- [x] **Cuentas creadas por el administrador, con roles.** `5c8776d` `a6425b1` `657558a` `9ea3c31`
  - **Qué:** tabla `cuentas` (usuario único en minúsculas y hash scrypt), y `GET` y `POST /cuentas`, que solo aceptan al administrador del `.env` (403 para el resto). El `GET` pagina, busca y ordena como `GET /usuarios`. El login acepta ambos tipos de cuenta y el JWT lleva el rol (`admin` u `operador`). Si el usuario no existe, el login igual verifica una contraseña contra un hash señuelo, así que la respuesta tarda lo mismo. En el panel, la página Cuentas (solo para el admin) tiene dos pestañas, como Usuarios: una tabla con búsqueda, orden y páginas en la URL, y un formulario con las mismas reglas de la API (compartidas con el alias `@dominio-cuentas`) que genera contraseñas seguras.
  - **Por qué:** con un solo usuario compartido no se puede dar acceso a otra persona sin entregarle la contraseña del administrador, ni quitárselo después.
- [x] **CORS con lista de orígenes.** `6933168`
  - **Qué:** los orígenes permitidos vienen de la configuración, y `*` está prohibido en producción.
  - **Por qué:** por defecto aceptaba peticiones desde cualquier sitio.
- [x] **Límite de peticiones por IP.** `9c35c3e`
  - **Qué:** 100 por minuto en general, 10 para el login y 30 para el logo. Detrás de nginx se lee la IP real (`TRUST_PROXY`).
  - **Por qué:** el contador del logo se inflaba con un bucle, y el login quedaba expuesto a fuerza bruta.
- [x] **Logs sin datos personales.** `44359ba` `c1d04e3` `f51ef22`
  - **Qué:** logs estructurados con pino, una línea por petición y un id que viene de nginx (o se genera). El token, el texto buscado y cualquier RUT se enmascaran.
  - **Por qué:** sin id no se puede seguir una petición entre nginx y la API, y los RUT no deben terminar en un sistema de logs.
- [x] **Secretos fuera del repositorio.** `a59eb84` `80d43f3`
  - **Qué:** `docker-compose.yml` toma las contraseñas del `.env` y no arranca si faltan. Los puertos se publican solo en `127.0.0.1`, y `.env.example` documenta cada variable.
  - **Por qué:** la contraseña de Postgres estaba escrita en el compose.
- [x] **Imágenes Docker endurecidas.** `0e06a91` `80d43f3`
  - **Qué:** usuario sin privilegios, sistema de archivos de solo lectura, sin capacidades de Linux y un `.dockerignore` que enumera lo permitido.
  - **Por qué:** si alguien comprometiera el proceso, tendría mucho menos alcance.
- [ ] **Borrado lógico y auditoría.**
  - **Qué:** `@DeleteDateColumn` y registro de quién creó, modificó o borró cada usuario.
  - **Por qué:** con datos personales hay que poder responder quién hizo qué, y recuperar un borrado por error.
- [ ] **Escaneo de dependencias.**
  - **Qué:** `pnpm audit` y Dependabot o Renovate.
  - **Por qué:** avisa de vulnerabilidades conocidas en los paquetes sin revisarlos a mano.

## Operación

- [x] **Configuración validada al arrancar.** `fcac60f` `a1abdf3`
  - **Qué:** las variables de entorno se validan al iniciar y se leen tipadas desde `ConfigService`. El código ya no trae credenciales por defecto.
  - **Por qué:** si faltaba una variable, la app arrancaba con valores inventados (`postgres/postgres`) y fallaba más tarde, lejos de la causa.
- [x] **El logo ya no puede botar el servidor.** `3acfba3`
  - **Qué:** el SVG vive junto a su módulo, se copia al build y se carga en memoria al iniciar. Se responde con `StreamableFile`.
  - **Por qué:** se leía desde `process.cwd()/src/assets`, que no existe si se despliega solo `dist/`, y el error del stream no tenía manejador, así que tumbaba el proceso.
- [x] **Errores en formato Problem Details.** `1e0a3ed`
  - **Qué:** un filtro global responde todos los errores como `application/problem+json` (RFC 9457). Los de validación traen la lista de campos, y un 500 no expone detalles internos.
  - **Por qué:** cada error tenía un formato distinto, y los de base de datos llegaban como 500 genéricos, sin nada que el cliente pudiera mostrar.
- [x] **`/health` con el estado de las dependencias.** `73904e9`
  - **Qué:** `GET /health` revisa Postgres y Redis y responde `ok`, `degraded` (sin Redis, con 200) o `error` (sin base de datos, con 503).
  - **Por qué:** Docker y un balanceador necesitan saber si la API puede atender. Sin Redis sigue pudiendo, así que no hay que reiniciarla.
- [x] **Errores de arranque visibles.** `f2be1df`
  - **Qué:** si `bootstrap()` falla, registra el error y termina con código 1.
  - **Por qué:** un fallo al arrancar quedaba como una promesa rechazada sin manejar.
- [ ] **Métricas.**
  - **Qué:** `/metrics` con Prometheus u OpenTelemetry.
  - **Por qué:** en producción hace falta ver latencia, errores y uso, no solo logs.

## Diseño de la API

- [x] **Rutas versionadas.** `e3331dc`
  - **Qué:** todas las rutas bajo `/api/v1`; `/health` queda en la raíz.
  - **Por qué:** un cambio incompatible puede salir como v2 sin romper a quien usa la v1.
- [x] **Paginación, búsqueda y orden en el servidor.** `4128419` `716bd74`
  - **Qué:** `?page=&limit=` (máximo 100) con respuesta `{ data, meta }`; `?buscar=` por nombre sin tildes (`unaccent`) o por RUT, con o sin puntos; `?orden=` con una lista cerrada de opciones.
  - **Por qué:** `findAll` devolvía la tabla completa, y no había forma de buscar a alguien por su RUT.
- [x] **Concurrencia optimista.** `e694b92`
  - **Qué:** cada usuario tiene una versión que la API entrega como `ETag`. Un `PATCH` con un `If-Match` desactualizado responde 412, y la versión se compara en el mismo `UPDATE`.
  - **Por qué:** si dos personas editaban al mismo usuario, la última pisaba a la primera sin aviso.
- [x] **DTO de respuesta en vez de la entidad.** `818f531`
  - **Qué:** `UsuarioDto.desde(entidad)`, una conversión explícita y tipada.
  - **Por qué:** devolver la entidad ataba el contrato de la API al esquema de la base de datos.
- [x] **Validaciones más estrictas.** `03caa81`
  - **Qué:** el nombre se guarda sin espacios de sobra y no puede quedar vacío; un `PATCH` vacío o con `null` se rechaza; no hay conversión implícita de tipos.
  - **Por qué:** se aceptaban nombres de solo espacios, `{"nombre": null}` provocaba un 500 y la conversión implícita podía convertir `"false"` en `true`.
- [x] **Cabecera `Location` en el 201.** `e113547`
  - **Qué:** el `POST` responde con la URL del usuario creado.
  - **Por qué:** es lo que define HTTP para un recurso nuevo; el cliente no tiene que armar la URL.
- [x] **Documentación OpenAPI.** `0f65d35` `f1e042f` `36689a6`
  - **Qué:** Swagger en `/docs` (apagado en producción), con autenticación, ejemplos y los errores de cada ruta. Los comentarios que repetían el código pasaron a ser la descripción de cada endpoint.
  - **Por qué:** no había forma de saber cómo consumir la API sin leer el código.
- [ ] **Colección de peticiones.**
  - **Qué:** un archivo `.http` con cada endpoint listo para ejecutar.
  - **Por qué:** permite probar la API sin armar las peticiones a mano.

## Contador de visitas

- [x] **Redis como dependencia secundaria.** `c109685` `b1a9fd5` `29a47ce`
  - **Qué:** si Redis cae, el logo se sirve igual (sin el conteo) y la API falla rápido en vez de encolar comandos. La caída se registra una vez y la conexión se cierra al apagar. Redis acepta contraseña.
  - **Por qué:** una dependencia secundaria tumbaba la función principal, y con Redis caído cada petición esperaba 10 segundos.
- [x] **Contador persistente.** `80d43f3`
  - **Qué:** Redis guarda los datos con AOF en un volumen.
  - **Por qué:** el contador volvía a cero cada vez que se recreaba el contenedor.
- [x] **El contador como recurso.** `6db63d4`
  - **Qué:** `/logo/count` pasa a ser `/logo/visitas`, y las dos rutas del logo responden `Cache-Control: no-store`.
  - **Por qué:** `GET /logo` suma una visita: si un caché intermedio guardara la respuesta, esas visitas se perderían.
- [ ] **Visitantes únicos.**
  - **Qué:** HyperLogLog de Redis (`PFADD` y `PFCOUNT`) con la IP hasheada.
  - **Por qué:** distingue visitas de visitantes con unos 12 KB de memoria y sin guardar IP.
- [ ] **Visitas por día.**
  - **Qué:** una clave por día, con vencimiento.
  - **Por qué:** permite graficar las visitas en el tiempo.
- [ ] **Contador en tiempo real.**
  - **Qué:** Server-Sent Events desde la API, avisados con Redis pub/sub en cada incremento.
  - **Por qué:** hoy el total se lee al cargar la página; así se vería subir sin recargar.

## Frontend

- [x] **Una aplicación web que cierra el ciclo.** `8334d2e`
  - **Qué:** SPA en React 19, Vite y TypeScript: login, tabla con búsqueda, orden y paginación que se guardan en la URL, registro, edición, borrado con confirmación y el logo con su contador.
  - **Por qué:** la prueba es fullstack y el repositorio no tenía frontend.
- [x] **La regla del RUT, escrita una sola vez.** `8334d2e`
  - **Qué:** el frontend importa el mismo `Rut` del backend (alias `@dominio`). Formatea el RUT mientras se escribe y avisa qué dígito corresponde antes de enviar.
  - **Por qué:** dos implementaciones del módulo 11 terminan diferenciándose.
- [x] **Tipos generados desde OpenAPI.** `8334d2e`
  - **Qué:** `pnpm gen:api` genera los tipos del frontend desde `/docs-json`.
  - **Por qué:** si la API cambia y no se regeneran, el frontend deja de compilar, en vez de fallar en producción.
- [x] **Navegación por páginas.** `7157ed8` `553dd2e` `ed30ee1` `e7b5cb0`
  - **Qué:** sitio de inicio con un validador de RUT en vivo, login que vuelve a la página pedida, y un panel con resumen y usuarios en pestañas. El detalle y la edición se abren en una ventana modal (`<dialog>` nativo).
  - **Por qué:** una sola pantalla con formulario y lista no admite más secciones. Con rutas, cada página se puede enlazar, recargar y volver atrás.
- [x] **Diseño con la marca de Uno.** `f6ff0f6` `553dd2e`
  - **Qué:** la estructura, la paleta y la tipografía (Montserrat) de uno.cl. Los colores que no alcanzan el contraste AA para texto chico solo decoran.
  - **Por qué:** es una herramienta interna de Uno, y tiene que verse como parte de su producto.
- [x] **Accesibilidad verificada.** `8334d2e` `e7b5cb0`
  - **Qué:** contraste WCAG AA, uso completo con teclado, el foco vuelve a donde estaba y los avisos llegan a los lectores de pantalla. axe lo revisa en los tests y en un navegador real.
  - **Por qué:** es una herramienta de trabajo diario y tiene que poder usarla cualquier persona.

## Tests y calidad

- [x] **Lint y formato en verde, revisados en cada commit.** `354a22e` `4636f70`
  - **Qué:** ESLint y Prettier en el backend, oxlint y Prettier en el frontend, y un pre-commit con husky y lint-staged.
  - **Por qué:** el lint fallaba con 22 errores, y sin un control automático vuelve a romperse.
- [x] **TypeScript estricto.** `078c764`
  - **Qué:** `strict: true` en el backend; el frontend ya lo era.
  - **Por qué:** `noImplicitAny: false` dejaba pasar errores de tipo.
- [x] **Tests e2e reales en el backend.** `d50317b` `443c5e8` `586e0c9`
  - **Qué:** e2e de `/usuarios`, `/auth`, `/cuentas`, `/logo` y `/health` contra Postgres y Redis desechables (Testcontainers). Usan la misma configuración HTTP que producción (`configureApp()`).
  - **Por qué:** el único e2e probaba el "Hello World" y necesitaba una base de datos preparada a mano.
- [x] **Tests del frontend y e2e de punta a punta.** `8334d2e` `e7b5cb0` `7cd793e` `c4a1793`
  - **Qué:** Vitest, Testing Library y MSW, con una API falsa que replica las reglas del backend. Playwright con un navegador real contra la API, Postgres y Redis, en una base de datos exclusiva para los tests. Los e2e prueban lo que solo se ve con el stack real: RUT único al registrar y al editar, paginación y orden de la API, dos personas editando al mismo usuario (412 con `If-Match`), permisos de cada rol y un JWT manipulado. Inician sesión por la API una vez por rol, porque el login admite 10 intentos por minuto. Uno de ellos encontró un bug, ya corregido: tras un 404 al guardar, la tabla seguía mostrando al usuario eliminado.
  - **Por qué:** un cambio en cualquier capa tiene que romper un test antes de llegar a quien usa la app.
- [x] **Sin código ni dependencias sobrantes.** `586e0c9` `ea00eff`
  - **Qué:** fuera el "Hello World" de la plantilla y tres dependencias sin uso (`@types/ioredis`, `@nestjs/serve-static` y `@nestjs/mapped-types`).
  - **Por qué:** el código muerto y los paquetes de más son ruido y superficie de ataque.
- [x] **Estructura por módulos.** `8d299f8` `a3a63bd`
  - **Qué:** `modules/<funcionalidad>/` con su dominio, entidades y DTOs; `infrastructure/` para la base de datos, Redis y los logs, y `common/` para lo transversal. El servicio del logo se separó del contador de visitas.
  - **Por qué:** se sabe dónde va cada cosa sin abrir archivos, y cada servicio tiene una sola responsabilidad.
- [ ] **Umbral de cobertura.**
  - **Qué:** `coverageThreshold` en Jest.
  - **Por qué:** evita que la cobertura retroceda sin que nadie lo note.
- [ ] **Tests basados en propiedades para el `Rut`.**
  - **Qué:** `fast-check` genera miles de RUT: los que tienen su dígito correcto pasan y con cualquier otro dígito fallan.
  - **Por qué:** hoy se prueban unos pocos casos escritos a mano.
- [ ] **Prueba de carga del contador.**
  - **Qué:** k6 con N peticiones concurrentes a `/logo`; el contador tiene que subir exactamente N.
  - **Por qué:** demuestra que `INCR` no pierde visitas bajo concurrencia.

## Entorno y entrega

- [x] **Todo el stack con Docker.** `0e06a91` `80d43f3`
  - **Qué:** Dockerfiles multi-etapa de la API y del frontend (nginx), y un compose con migraciones, API, web, Postgres y Redis, con healthchecks.
  - **Por qué:** solo la infraestructura estaba en Docker; levantar la app requería pasos a mano.
- [x] **Integración continua con checks obligatorios.** `746ab1a`
  - **Qué:** GitHub Actions corre en cada pull request tres jobs en paralelo, sobre el merge del PR con `master`: backend (lint, tipos, unitarios y e2e con Testcontainers), frontend (tipos, lint, formato y Vitest) y e2e con Playwright contra Postgres y Redis reales. `master` está protegida: los tres checks son obligatorios, también para el administrador del repositorio.
  - **Por qué:** los tests solo corrían en la máquina de quien se acordaba de correrlos, y nada impedía mergear un cambio que rompiera algo.
- [x] **Un comando para desarrollar.** `995e2da`
  - **Qué:** `pnpm dev` instala las dependencias, levanta Postgres y Redis, aplica las migraciones y arranca la API y el frontend juntos.
  - **Por qué:** probar el proyecto no debería exigir seguir una lista de pasos.
- [x] **Historial legible.** desde `354a22e`
  - **Qué:** commits atómicos con Conventional Commits; cada mensaje explica el porqué del cambio.
  - **Por qué:** el historial es la documentación de cada decisión.
- [x] **README con diagramas y esta lista.**
  - **Qué:** arquitectura y flujos en Mermaid, cómo levantar el proyecto y este documento.
  - **Por qué:** son los puntos 1, 2 y 3 de la prueba.
- [x] **Sin código comentado.** `d58a775`
  - **Qué:** se borraron las 805 líneas marcadas `[ANTES]`, que mostraban el código anterior junto al nuevo, y un id de botón que ya nadie leía.
  - **Por qué:** sirvieron para revisar cada cambio en contexto mientras se trabajaba, pero git ya guarda el antes, y el código comentado se desactualiza y confunde.
- [ ] **Versiones de herramientas fijadas.** Hoy el frontend ya fija versiones exactas de sus dependencias.
  - **Qué:** `engines` y `packageManager` en `package.json`, y un `.nvmrc`.
  - **Por qué:** evita diferencias por la versión de Node o de pnpm de cada equipo.
- [ ] **Registros de decisiones de arquitectura (ADR).**
  - **Qué:** media página por decisión: contexto, opciones consideradas y la elegida.
  - **Por qué:** el porqué de cada decisión queda junto al código, no solo en los mensajes de commit.
- [ ] **Convención de idioma escrita.**
  - **Qué:** fijar la regla (dominio en español, términos técnicos en inglés) y aplicarla.
  - **Por qué:** hoy el código mezcla los dos idiomas sin una regla escrita.
