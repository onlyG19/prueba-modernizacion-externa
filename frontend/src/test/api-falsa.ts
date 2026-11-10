import { http, HttpResponse } from 'msw';
import type {
  CambiosUsuario,
  Credenciales,
  NuevoUsuario,
  PaginaUsuarios,
  Usuario,
} from '../api/tipos';

export const TOKEN_PRUEBA = 'token-de-prueba';
export const CREDENCIALES_VALIDAS = { username: 'admin', password: 'correcta' };

const LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';

/** Un usuario para armar un escenario: las fechas se completan solas. */
export type UsuarioDePrueba = Pick<Usuario, 'id' | 'nombre' | 'rut'> &
  Partial<Usuario>;

/** Fecha fija para los usuarios iniciales: los tests no dependen del reloj. */
const FECHA_INICIAL = '2026-11-10T12:00:00.000Z';

const conFechas = (usuario: UsuarioDePrueba): Usuario => ({
  creadoEn: FECHA_INICIAL,
  actualizadoEn: FECHA_INICIAL,
  version: 1,
  ...usuario,
});

export interface EstadoApiFalsa {
  usuarios: Usuario[];
  visitas: number;
  redisDisponible: boolean;
  /** Cuerpos recibidos, para verificar qué envió el frontend. */
  recibidos: { creaciones: NuevoUsuario[]; cambios: CambiosUsuario[] };
}

const COLECCION = new Intl.Collator('es', { sensitivity: 'base' });
const SIN_TILDES = /\p{Diacritic}/gu;
const SEPARADORES_RUT = /[.\-\s]/g;

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(SIN_TILDES, '').toLowerCase();

/**
 * `GET /usuarios` como lo responde la API real: busca por nombre sin tildes o
 * por RUT sin separadores, ordena por nombre y entrega una página con su `meta`.
 */
function paginar(usuarios: Usuario[], url: URL): PaginaUsuarios {
  const page = Number(url.searchParams.get('page') ?? 1);
  const limit = Number(url.searchParams.get('limit') ?? 20);
  const texto = normalizar(url.searchParams.get('buscar')?.trim() ?? '');
  const rut = texto.replace(SEPARADORES_RUT, '');
  // `?orden=-creadoEn`: por fecha de registro, de la más nueva a la más vieja.
  const orden = url.searchParams.get('orden') ?? 'nombre';
  const sentido = orden.startsWith('-') ? -1 : 1;
  const comparar = (a: Usuario, b: Usuario) =>
    orden.endsWith('creadoEn')
      ? a.creadoEn.localeCompare(b.creadoEn)
      : COLECCION.compare(a.nombre, b.nombre);
  const coincidentes = usuarios
    .filter(
      (u) =>
        !texto ||
        normalizar(u.nombre).includes(texto) ||
        (rut !== '' && u.rut.replace('-', '').toLowerCase().includes(rut)),
    )
    // [ANTES] .toSorted((a, b) => COLECCION.compare(a.nombre, b.nombre) || a.id - b.id);
    // [ANTES] .toSorted((a, b) => sentido * comparar(a, b) || a.id - b.id);
    .toSorted((a, b) => sentido * comparar(a, b) || a.id.localeCompare(b.id));
  const total = coincidentes.length;
  return {
    data: coincidentes.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/** Escenario inicial de la API falsa; los usuarios pueden venir sin fechas. */
export type EscenarioApiFalsa = Partial<Omit<EstadoApiFalsa, 'usuarios'>> & {
  usuarios?: UsuarioDePrueba[];
};

/** Errores con el mismo formato que la API real: Problem Details (RFC 9457). */
const error = (status: number, detail: string, title: string) =>
  HttpResponse.json(
    { type: 'about:blank', title, status, detail, instance: '/' },
    {
      status,
      headers: { 'Content-Type': 'application/problem+json' },
    },
  );

/**
 * Backend falso en memoria, con las mismas reglas que la API real: exige el
 * token, responde 409 ante un RUT duplicado y 204 al eliminar.
 */
// [ANTES] export function crearApiFalsa(inicial: Partial<EstadoApiFalsa> = {}) {
export function crearApiFalsa({
  usuarios = [
    // [ANTES] { id: 2, nombre: 'Juan Pérez', rut: '12345678-5' },
    { id: 'u2', nombre: 'Juan Pérez', rut: '12345678-5' },
    // [ANTES] { id: 3, nombre: 'María López', rut: '9876543-3' },
    { id: 'u3', nombre: 'María López', rut: '9876543-3' },
  ],
  ...inicial
}: EscenarioApiFalsa = {}) {
  const estado: EstadoApiFalsa = {
    // [ANTES] usuarios: [
    // [ANTES]   { id: 2, nombre: 'Juan Pérez', rut: '12345678-5' },
    // [ANTES]   { id: 3, nombre: 'María López', rut: '9876543-3' },
    // [ANTES] ],
    usuarios: usuarios.map(conFechas),
    visitas: 41,
    redisDisponible: true,
    recibidos: { creaciones: [], cambios: [] },
    ...inicial,
  };
  // [ANTES] let siguienteId = 100;
  // Ids como los de la API real: UUID (crypto.randomUUID() al crear).

  const autorizado = (request: Request) =>
    request.headers.get('Authorization') === `Bearer ${TOKEN_PRUEBA}`;
  const noAutorizado = () =>
    error(401, 'Token inválido o expirado', 'Unauthorized');

  const handlers = [
    // [ANTES] http.post('/api/auth/login', async ({ request }) => {
    http.post('/api/v1/auth/login', async ({ request }) => {
      const { username, password } = (await request.json()) as Credenciales;
      if (
        username === CREDENCIALES_VALIDAS.username &&
        password === CREDENCIALES_VALIDAS.password
      ) {
        return HttpResponse.json({
          accessToken: TOKEN_PRUEBA,
          tokenType: 'Bearer',
          expiresIn: 3600,
        });
      }
      return error(401, 'Credenciales inválidas', 'Unauthorized');
    }),

    // [ANTES] http.get('/api/usuarios', ({ request }) =>
    http.get('/api/v1/usuarios', ({ request }) =>
      // [ANTES] autorizado(request) ? HttpResponse.json(estado.usuarios) : noAutorizado(),
      autorizado(request)
        ? HttpResponse.json(paginar(estado.usuarios, new URL(request.url)))
        : noAutorizado(),
    ),

    http.get('/api/v1/usuarios/:id', ({ request, params }) => {
      if (!autorizado(request)) {
        return noAutorizado();
      }
      const usuario = estado.usuarios.find((u) => u.id === params.id);
      return usuario
        ? HttpResponse.json(usuario)
        : error(404, 'Usuario no encontrado', 'Not Found');
    }),

    // [ANTES] http.post('/api/usuarios', async ({ request }) => {
    http.post('/api/v1/usuarios', async ({ request }) => {
      if (!autorizado(request)) {
        return noAutorizado();
      }
      const datos = (await request.json()) as NuevoUsuario;
      estado.recibidos.creaciones.push(datos);
      if (estado.usuarios.some((u) => u.rut === datos.rut)) {
        return error(
          409,
          `Ya existe un usuario con el RUT ${datos.rut}`,
          'Conflict',
        );
      }
      // [ANTES] const creado = { id: siguienteId++, ...datos };
      const ahora = new Date().toISOString();
      const creado = {
        // [ANTES] id: siguienteId++,
        id: crypto.randomUUID(),
        ...datos,
        creadoEn: ahora,
        actualizadoEn: ahora,
        version: 1,
      };
      estado.usuarios.push(creado);
      return HttpResponse.json(creado, { status: 201 });
    }),

    // [ANTES] http.patch('/api/usuarios/:id', async ({ request, params }) => {
    http.patch('/api/v1/usuarios/:id', async ({ request, params }) => {
      if (!autorizado(request)) {
        return noAutorizado();
      }
      const cambios = (await request.json()) as CambiosUsuario;
      estado.recibidos.cambios.push(cambios);
      // [ANTES] const usuario = estado.usuarios.find((u) => u.id === Number(params.id));
      const usuario = estado.usuarios.find((u) => u.id === params.id);
      if (!usuario) {
        return error(404, 'Usuario no encontrado', 'Not Found');
      }
      // Concurrencia optimista, como la API real: If-Match con otra versión → 412.
      const ifMatch = request.headers.get('If-Match');
      if (ifMatch !== null && ifMatch !== `"${usuario.version}"`) {
        return error(
          412,
          'El usuario cambió desde que lo leíste',
          'Precondition Failed',
        );
      }
      // [ANTES] Object.assign(usuario, cambios);
      // [ANTES] Object.assign(usuario, cambios, {
      // [ANTES]   actualizadoEn: new Date().toISOString(),
      // [ANTES] });
      Object.assign(usuario, cambios, {
        actualizadoEn: new Date().toISOString(),
        version: usuario.version + 1,
      });
      return HttpResponse.json(usuario);
    }),

    // [ANTES] http.delete('/api/usuarios/:id', ({ request, params }) => {
    http.delete('/api/v1/usuarios/:id', ({ request, params }) => {
      if (!autorizado(request)) {
        return noAutorizado();
      }
      estado.usuarios = estado.usuarios.filter(
        // [ANTES] (u) => u.id !== Number(params.id),
        (u) => u.id !== params.id,
      );
      return new HttpResponse(null, { status: 204 });
    }),

    // [ANTES] http.get('/api/logo', () => {
    http.get('/api/v1/logo', () => {
      const cabeceras: Record<string, string> = {
        'Content-Type': 'image/svg+xml',
      };
      if (estado.redisDisponible) {
        estado.visitas++;
        cabeceras['X-Request-Count'] = String(estado.visitas);
      }
      return new HttpResponse(LOGO_SVG, { headers: cabeceras });
    }),

    // Solo lee el contador (no suma una visita); sin Redis, 503.
    http.get('/api/v1/logo/visitas', () =>
      estado.redisDisponible
        ? HttpResponse.json({ count: estado.visitas })
        : error(503, 'Redis no está disponible', 'Service Unavailable'),
    ),
  ];

  return { estado, handlers };
}
