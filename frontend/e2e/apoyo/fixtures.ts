import {
  expect,
  test as base,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { etiquetaUnica } from './datos';

/** Administrador de la base de datos e2e (ver playwright.config.ts). */
export const ADMIN: Credenciales = {
  usuario: 'admin',
  clave: 'e2e-clave-de-prueba',
};

/** Donde la consola guarda la sesión (ver src/sesion/almacen-sesion.ts). */
export const CLAVE_SESION = 'consola-usuarios:sesion:v2';

/** Marca que la sesión ya se sembró en esta pestaña (ver `sembrarSesion`). */
const MARCA_SEMBRADA = 'e2e:sesion-sembrada';

const API = '/api/v1';

export type Rol = 'admin' | 'operador';

export interface Credenciales {
  usuario: string;
  clave: string;
}

/** La sesión tal como la guarda la consola en `sessionStorage`. */
export interface Sesion {
  token: string;
  usuario: string;
  rol: Rol;
  /** Milisegundos desde epoch. */
  expiraEn: number;
}

/** Un usuario como lo devuelve la API. */
export interface Usuario {
  id: string;
  nombre: string;
  rut: string;
  version: number;
}

async function iniciarSesionPorApi(
  api: APIRequestContext,
  { usuario, clave }: Credenciales,
): Promise<Sesion> {
  const respuesta = await api.post(`${API}/auth/login`, {
    data: { username: usuario, password: clave },
  });
  await expect(respuesta, `login de ${usuario}`).toBeOK();
  const { accessToken, expiresIn, rol } = (await respuesta.json()) as {
    accessToken: string;
    expiresIn: number;
    rol: Rol;
  };
  return {
    token: accessToken,
    usuario,
    rol,
    expiraEn: Date.now() + expiresIn * 1000,
  };
}

/**
 * Deja la sesión en `sessionStorage` antes de que cargue la app, como si se
 * hubiera ingresado por el formulario.
 *
 * @remarks Solo en la primera carga de cada pestaña: si el test cierra sesión
 * o cambia lo guardado, una recarga no lo deshace.
 */
export async function sembrarSesion(contexto: BrowserContext, sesion: Sesion) {
  await contexto.addInitScript(
    ([clave, marca, valor]) => {
      if (sessionStorage.getItem(marca) === null) {
        sessionStorage.setItem(clave, valor);
        sessionStorage.setItem(marca, '1');
      }
    },
    [CLAVE_SESION, MARCA_SEMBRADA, JSON.stringify(sesion)] as const,
  );
}

/**
 * Atajos contra la API real, con el token del admin: preparan los datos de un
 * test (o comprueban lo que quedó en Postgres) sin pasar por la interfaz.
 */
export class ApiDePrueba {
  constructor(
    private readonly api: APIRequestContext,
    private readonly token: string,
  ) {}

  private get cabeceras() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async crearUsuario(nombre: string, rut: string): Promise<Usuario> {
    const respuesta = await this.api.post(`${API}/usuarios`, {
      headers: this.cabeceras,
      data: { nombre, rut },
    });
    await expect(respuesta, `registrar a ${nombre}`).toBeOK();
    return (await respuesta.json()) as Usuario;
  }

  async obtenerUsuario(id: string): Promise<Usuario> {
    const respuesta = await this.api.get(`${API}/usuarios/${id}`, {
      headers: this.cabeceras,
    });
    await expect(respuesta).toBeOK();
    return (await respuesta.json()) as Usuario;
  }

  async eliminarUsuario(id: string): Promise<void> {
    const respuesta = await this.api.delete(`${API}/usuarios/${id}`, {
      headers: this.cabeceras,
    });
    await expect(respuesta).toBeOK();
  }

  async crearCuenta({ usuario, clave }: Credenciales): Promise<void> {
    const respuesta = await this.api.post(`${API}/cuentas`, {
      headers: this.cabeceras,
      data: { username: usuario, password: clave },
    });
    await expect(respuesta, `crear la cuenta ${usuario}`).toBeOK();
  }
}

interface FixturesDeWorker {
  /**
   * La sesión de un rol, iniciada por la API una sola vez por worker.
   *
   * @remarks La API admite 10 logins por minuto por IP y la suite completa
   * dura menos que eso: ingresar por el formulario en cada test agotaría el
   * límite. El formulario se usa solo donde el login es lo que se prueba.
   */
  sesionDe: (rol: Rol) => Promise<Sesion>;
}

interface FixturesDeTest {
  /**
   * Con qué sesión abre la consola el test: `admin` por defecto, o `null`
   * para entrar sin sesión. Se cambia con `test.use({ sesion: ... })`.
   */
  sesion: Rol | null;
  /** La API real, autenticada como admin. */
  api: ApiDePrueba;
  /**
   * Otra persona con la consola abierta en su propio navegador (otro
   * contexto, con su propio `sessionStorage`), con sesión de admin.
   */
  otraPersona: Page;
}

export const test = base.extend<FixturesDeTest, FixturesDeWorker>({
  sesionDe: [
    async ({ playwright }, use, workerInfo) => {
      const api = await playwright.request.newContext({
        baseURL: workerInfo.project.use.baseURL,
      });
      const sesiones = new Map<Rol, Promise<Sesion>>();

      async function iniciar(rol: Rol): Promise<Sesion> {
        if (rol === 'admin') {
          return iniciarSesionPorApi(api, ADMIN);
        }
        // Un operador necesita una cuenta, y solo el admin puede crearla.
        const operador = {
          usuario: `operador.${etiquetaUnica()}`,
          clave: 'una frase larga y secreta',
        };
        const admin = await sesionDe('admin');
        await new ApiDePrueba(api, admin.token).crearCuenta(operador);
        return iniciarSesionPorApi(api, operador);
      }

      function sesionDe(rol: Rol): Promise<Sesion> {
        let sesion = sesiones.get(rol);
        if (!sesion) {
          sesion = iniciar(rol);
          sesiones.set(rol, sesion);
        }
        return sesion;
      }

      await use(sesionDe);
      await api.dispose();
    },
    { scope: 'worker' },
  ],

  sesion: ['admin', { option: true }],

  context: async ({ context, sesion, sesionDe }, use) => {
    if (sesion) {
      await sembrarSesion(context, await sesionDe(sesion));
    }
    await use(context);
  },

  api: async ({ request, sesionDe }, use) => {
    const { token } = await sesionDe('admin');
    await use(new ApiDePrueba(request, token));
  },

  otraPersona: async ({ browser, baseURL, sesionDe }, use) => {
    const contexto = await browser.newContext({ baseURL });
    await sembrarSesion(contexto, await sesionDe('admin'));
    await use(await contexto.newPage());
    await contexto.close();
  },
});

export { expect };
