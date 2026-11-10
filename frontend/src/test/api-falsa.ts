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
  const coincidentes = usuarios
    .filter(
      (u) =>
        !texto ||
        normalizar(u.nombre).includes(texto) ||
        (rut !== '' && u.rut.replace('-', '').toLowerCase().includes(rut)),
    )
    .toSorted((a, b) => COLECCION.compare(a.nombre, b.nombre) || a.id - b.id);
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
    { id: 2, nombre: 'Juan Pérez', rut: '12345678-5' },
    { id: 3, nombre: 'María López', rut: '9876543-3' },
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
  let siguienteId = 100;

  const autorizado = (request: Request) =>
    request.headers.get('Authorization') === `Bearer ${TOKEN_PRUEBA}`;
  const noAutorizado = () =>
    error(401, 'Token inválido o expirado', 'Unauthorized');

  const handlers = [
    http.post('/api/auth/login', async ({ request }) => {
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

    http.get('/api/usuarios', ({ request }) =>
      // [ANTES] autorizado(request) ? HttpResponse.json(estado.usuarios) : noAutorizado(),
      autorizado(request)
        ? HttpResponse.json(paginar(estado.usuarios, new URL(request.url)))
        : noAutorizado(),
    ),

    http.post('/api/usuarios', async ({ request }) => {
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
        id: siguienteId++,
        ...datos,
        creadoEn: ahora,
        actualizadoEn: ahora,
      };
      estado.usuarios.push(creado);
      return HttpResponse.json(creado, { status: 201 });
    }),

    http.patch('/api/usuarios/:id', async ({ request, params }) => {
      if (!autorizado(request)) {
        return noAutorizado();
      }
      const cambios = (await request.json()) as CambiosUsuario;
      estado.recibidos.cambios.push(cambios);
      const usuario = estado.usuarios.find((u) => u.id === Number(params.id));
      if (!usuario) {
        return error(404, 'Usuario no encontrado', 'Not Found');
      }
      // [ANTES] Object.assign(usuario, cambios);
      Object.assign(usuario, cambios, {
        actualizadoEn: new Date().toISOString(),
      });
      return HttpResponse.json(usuario);
    }),

    http.delete('/api/usuarios/:id', ({ request, params }) => {
      if (!autorizado(request)) {
        return noAutorizado();
      }
      estado.usuarios = estado.usuarios.filter(
        (u) => u.id !== Number(params.id),
      );
      return new HttpResponse(null, { status: 204 });
    }),

    http.get('/api/logo', () => {
      const cabeceras: Record<string, string> = {
        'Content-Type': 'image/svg+xml',
      };
      if (estado.redisDisponible) {
        estado.visitas++;
        cabeceras['X-Request-Count'] = String(estado.visitas);
      }
      return new HttpResponse(LOGO_SVG, { headers: cabeceras });
    }),
  ];

  return { estado, handlers };
}
