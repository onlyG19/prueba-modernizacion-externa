# Registro de usuarios: prueba de modernización

Una API NestJS para registrar personas con su RUT, con un contador de visitas al logo en Redis, y un frontend React que la consume. Este repositorio parte del código de la prueba y lo moderniza de punta a punta.

> **Enunciado de la prueba**
>
> Tareas a realizar por postulantes:
>
> NOTA: La prueba esta diseñada para abordar la creatividad, conocimiento y experiencia de los postulantes, se valora muchísimo la implementación de mejoras del código, el hecho de poder abordar la mayor cantidad de mejoras y buenas prácticas que consideres para nosotros es clave y nos permite conocerte mejor como desarrollador, es una prueba fullstack por lo que se considera el ciclo end-to-end.
>
> Puntos de partida:
> 1. Elaborar diagrama de arquitectura
> 2. Elaborar diagrama de flujo
> 3. ¿Qué mejoras implementarías?

Las respuestas están más abajo: [arquitectura](#1-diagrama-de-arquitectura), [flujos](#2-diagramas-de-flujo) y [mejoras](#3-qué-mejoras-implementarías).

## Cómo levantarlo

Requisitos: Node 26, pnpm y Docker.

```bash
pnpm install
cp .env.example .env
# En .env, completa:
#   JWT_SECRET          → openssl rand -hex 32
#   AUTH_PASSWORD_HASH  → pnpm auth:hash-password <contraseña>
pnpm dev --seed
```

`pnpm dev` levanta Postgres y Redis con Docker, aplica las migraciones, carga usuarios de demostración (`--seed`) y arranca la API y el frontend:

- Frontend: http://localhost:5173 (usuario `admin` y la contraseña que elegiste). Desde **Cuentas**, el admin ve y crea las cuentas de otras personas.
- API: http://localhost:3000/api/v1, documentada con OpenAPI en http://localhost:3000/docs

Con `docker compose up` se levanta el stack de producción: el frontend en http://localhost:8080 servido por nginx, la API, las migraciones, Postgres y Redis.

El frontend tiene sus propias dependencias: `pnpm dev` las instala si faltan, o `pnpm --dir frontend install`.

| Comando | Qué hace |
| --- | --- |
| `pnpm test` | Tests unitarios del backend |
| `pnpm test:e2e` | Tests e2e del backend contra Postgres y Redis desechables (Testcontainers) |
| `pnpm --dir frontend test` | Tests del frontend (Vitest) |
| `pnpm --dir frontend test:e2e` | Tests e2e con navegador real (Playwright) contra el stack completo |

Cada pull request corre todo lo anterior en GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)), en tres checks: **Backend**, **Frontend** y **E2E**. Los tres son obligatorios: sin ellos en verde, `master` no acepta el merge.

## 1. Diagrama de arquitectura

```mermaid
flowchart LR
    navegador["Navegador<br/>React 19 + TypeScript"]

    subgraph web["web: nginx"]
        estaticos["Frontend compilado<br/>index.html para cualquier ruta"]
        proxy["Proxy /api/<br/>agrega X-Request-Id"]
    end

    subgraph api["api: NestJS 11"]
        http["Capa HTTP<br/>helmet, CORS, rutas /api/v1,<br/>validación de DTOs y errores<br/>como Problem Details"]
        guards["Guards globales<br/>límite por IP y JWT"]
        auth["auth<br/>POST /auth/login<br/>JWT con rol"]
        cuentas["cuentas<br/>GET y POST /cuentas<br/>solo el admin"]
        logo["logo<br/>GET /logo y /logo/visitas"]
        health["health<br/>GET /health"]
        usuarios["usuarios<br/>CRUD, búsqueda, paginación<br/>y concurrencia con ETag"]
    end

    redis[("Redis 7<br/>contador de visitas<br/>con persistencia AOF")]
    pg[("PostgreSQL 16<br/>usuarios: RUT único,<br/>id UUID y versión<br/>cuentas: usuario único<br/>y hash scrypt")]
    migraciones["migraciones<br/>corre y termina<br/>antes de la API"]

    navegador -->|"páginas"| estaticos
    navegador -->|"/api/v1/..."| proxy
    proxy --> http
    http --> guards
    guards --> auth
    guards --> cuentas
    guards --> logo
    guards --> health
    guards --> usuarios
    logo -->|"INCR / GET"| redis
    health -.->|"verifica"| redis
    health -.->|"verifica"| pg
    usuarios -->|"TypeORM"| pg
    auth -->|"verifica credenciales"| cuentas
    cuentas -->|"TypeORM"| pg
    migraciones --> pg
```

- **Un solo origen para el navegador.** nginx sirve el frontend y reenvía `/api/` a la API, así no hay CORS de por medio. En desarrollo, Vite cumple el mismo papel (`pnpm dev`).
- **La API es privada por defecto.** Un guard JWT global protege todas las rutas; solo `auth`, `logo` y `health` están marcadas como públicas con `@Public()`.
- **Dos roles.** El administrador es el usuario del `.env`; las cuentas que él crea ingresan como `operador`, que gestiona usuarios pero no ve ni crea cuentas. El rol va dentro del JWT y `/cuentas` lo exige con `SoloAdminGuard` (403 si no es admin).
- **El RUT se valida con el mismo código en ambos lados.** El value object `Rut` vive en el dominio del backend (`src/modules/usuarios/domain`) y el frontend lo importa con el alias `@dominio`. Las reglas de usuario y contraseña de las cuentas se comparten igual, con `@dominio-cuentas`.
- **Redis es una dependencia secundaria.** Si cae, la API sigue registrando usuarios y sirviendo el logo; solo se pierde el conteo, y `/health` responde `degraded` en vez de error.
- **El esquema cambia solo con migraciones**, que corren en su propio contenedor antes de que arranque la API. La API nunca altera tablas al iniciar.

## 2. Diagramas de flujo

### 2.1 Una petición a la API

Todo lo que pasa entre que llega una petición y sale la respuesta, con un `PATCH /api/v1/usuarios/:id` como ejemplo.

```mermaid
flowchart TD
    inicio["PATCH /api/v1/usuarios/:id"] --> nginx["nginx asigna X-Request-Id<br/>y reenvía a la API"]
    nginx --> cabeceras["helmet y CORS"]
    cabeceras --> guards{"Guards globales"}
    guards -->|"más de 100 peticiones<br/>por minuto desde la IP"| e429["429 Too Many Requests"]
    guards -->|"ruta privada sin<br/>JWT válido"| e401["401 Unauthorized"]
    guards -->|"pasa"| validacion{"¿Parámetros y cuerpo válidos?<br/>id UUID, RUT con dígito<br/>verificador, cuerpo no vacío"}
    validacion -->|"no"| e400["400 con la lista de errores"]
    validacion -->|"sí"| servicio["Controller, service y TypeORM"]
    servicio --> dominio{"¿Regla de negocio<br/>incumplida?"}
    dominio -->|"no existe"| e404["404"]
    dominio -->|"RUT de otro usuario"| e409["409"]
    dominio -->|"versión desactualizada"| e412["412"]
    dominio -->|"no"| ok["200 con el usuario<br/>y su ETag"]
    e429 --> problema["Filtro global:<br/>application/problem+json"]
    e401 --> problema
    e400 --> problema
    e404 --> problema
    e409 --> problema
    e412 --> problema
    ok --> log["pino escribe una línea por petición<br/>con su id y sin datos personales"]
    problema --> log
```

Login y logo tienen límites propios más estrictos (10 y 30 peticiones por minuto) y `/health` no tiene límite. Un error inesperado responde 500 sin exponer detalles internos.

### 2.2 Registrar un usuario

```mermaid
sequenceDiagram
    actor persona as Administrador
    participant front as Frontend
    participant api as API
    participant db as PostgreSQL

    persona->>front: Escribe nombre y RUT
    front->>front: Formatea el RUT y verifica el dígito<br/>verificador con el mismo Rut que la API
    alt El dígito verificador no corresponde
        front-->>persona: Le dice qué dígito corresponde, sin llamar a la API
    else Es válido
        front->>api: POST /api/v1/usuarios con Bearer JWT<br/>{ nombre, rut: "12345678-5" }
        api->>api: El DTO normaliza espacios y RUT<br/>y @IsRut() vuelve a validar el dígito
        api->>db: INSERT usuario
        alt El RUT ya existe
            db-->>api: Violación de UNIQUE (23505)
            api-->>front: 409 Problem Details
            front-->>persona: Error en el campo RUT
        else RUT nuevo
            db-->>api: Fila con id UUID, versión 1 y fecha
            api-->>front: 201 con Location y ETag
            front->>front: Invalida la lista en la caché
            front-->>persona: Confirma el registro y ofrece verlo en la tabla
        end
    end
```

### 2.3 Editar sin pisar el cambio de otra persona

Cada usuario tiene una versión que sube con cada cambio. La API la entrega como `ETag` y el frontend la devuelve en `If-Match` al guardar.

```mermaid
sequenceDiagram
    participant a as Persona A
    participant b as Persona B
    participant api as API
    participant db as PostgreSQL

    a->>api: GET /usuarios/:id
    api-->>a: 200, ETag "3"
    b->>api: GET /usuarios/:id
    api-->>b: 200, ETag "3"
    b->>api: PATCH con If-Match "3"
    api->>db: UPDATE ... WHERE id = :id AND version IN (3)
    db-->>api: 1 fila actualizada, versión 4
    api-->>b: 200, ETag "4"
    a->>api: PATCH con If-Match "3"
    api->>db: UPDATE ... WHERE id = :id AND version IN (3)
    db-->>api: 0 filas
    api-->>a: 412 Precondition Failed
    Note over a: El frontend avisa que otra persona<br/>lo cambió y recarga la versión vigente
```

La versión se compara dentro del mismo `UPDATE` y no en una lectura previa: de dos cambios simultáneos sobre la misma versión, uno se aplica y el otro recibe 412. Un test e2e lo comprueba con dos `PATCH` en paralelo.

### 2.4 Logo y contador de visitas

```mermaid
flowchart TD
    pedirLogo["GET /api/v1/logo<br/>pública, hasta 30 por minuto por IP"] --> incr{"INCR logo:request:count<br/>en Redis"}
    incr -->|"responde"| conConteo["200 con el SVG<br/>y X-Request-Count: total"]
    incr -->|"Redis no está"| sinConteo["200 con el SVG, sin la cabecera<br/>y un aviso en el log"]
    pedirTotal["GET /api/v1/logo/visitas<br/>solo lee, no suma"] --> leer{"GET del contador"}
    leer -->|"responde"| total["200 { count }"]
    leer -->|"Redis no está"| e503["503 Problem Details"]
```

El SVG se carga en memoria al iniciar la API, así que servirlo no puede fallar. Ambas rutas responden con `Cache-Control: no-store`, para que un caché intermedio no se trague visitas.

## 3. ¿Qué mejoras implementarías?

El detalle está en [docs/MEJORAS.md](docs/MEJORAS.md): una lista de tareas donde cada mejora dice qué se hizo, por qué y en qué commits, y las pendientes dicen qué se haría y por qué.

Los problemas más graves del código original eran:

- El RUT no validaba el dígito verificador ni era único: se podían guardar RUT inexistentes y duplicados, y un duplicado respondía 500.
- La API no tenía autenticación: cualquiera podía listar o borrar usuarios, y el RUT es un dato personal. Además, CORS aceptaba cualquier origen.
- `synchronize` de TypeORM quedaba activo si faltaba `NODE_ENV`, y en producción podía alterar el esquema y perder datos.
- El logo podía botar el servidor: se leía de una ruta relativa al directorio de trabajo, sin manejar el error del stream.
- Si Redis caía, tampoco se entregaba el logo.

## Estructura

```
src/                     API NestJS
├── config/              variables de entorno validadas, CORS, Swagger
├── common/              filtro Problem Details, ETag, pipes y decoradores
├── infrastructure/      base de datos (migraciones, seed), Redis y logs
├── health/              GET /health
└── modules/
    ├── auth/            login con JWT, guard global y roles
    ├── cuentas/         cuentas de operador que crea el admin
    ├── usuarios/        dominio (Rut), entidad, DTOs, controller y service
    └── logo/            logo y contador de visitas
test/                    tests e2e del backend
.github/workflows/       CI: lint, tipos y tests en cada pull request
frontend/                SPA en React (ver frontend/README.md)
docs/MEJORAS.md          mejoras hechas y pendientes
```
