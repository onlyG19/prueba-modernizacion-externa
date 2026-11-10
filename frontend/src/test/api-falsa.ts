import { http, HttpResponse } from 'msw';
import type {
  CambiosUsuario,
  Credenciales,
  NuevoUsuario,
  Usuario,
} from '../api/tipos';

export const TOKEN_PRUEBA = 'token-de-prueba';
export const CREDENCIALES_VALIDAS = { username: 'admin', password: 'correcta' };

const LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';

export interface EstadoApiFalsa {
  usuarios: Usuario[];
  visitas: number;
  redisDisponible: boolean;
  /** Cuerpos recibidos, para verificar qué envió el frontend. */
  recibidos: { creaciones: NuevoUsuario[]; cambios: CambiosUsuario[] };
}

const error = (statusCode: number, message: string, nombre: string) =>
  HttpResponse.json(
    { statusCode, message, error: nombre },
    { status: statusCode },
  );

/**
 * Backend falso en memoria, con las mismas reglas que la API real: exige el
 * token, responde 409 ante un RUT duplicado y 204 al eliminar.
 */
export function crearApiFalsa(inicial: Partial<EstadoApiFalsa> = {}) {
  const estado: EstadoApiFalsa = {
    usuarios: [
      { id: 2, nombre: 'Juan Pérez', rut: '12345678-5' },
      { id: 3, nombre: 'María López', rut: '9876543-3' },
    ],
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
      autorizado(request) ? HttpResponse.json(estado.usuarios) : noAutorizado(),
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
      const creado = { id: siguienteId++, ...datos };
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
      Object.assign(usuario, cambios);
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
