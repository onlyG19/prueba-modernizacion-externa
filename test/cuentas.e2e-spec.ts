import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { RUTA_API } from '../src/config/app-setup';
import type { ProblemDetailsDto } from '../src/common/dto/problem-details.dto';
import type { AccessTokenDto } from '../src/modules/auth/dto/access-token.dto';
import type { PaginaCuentasDto } from '../src/modules/cuentas/dto/pagina-cuentas.dto';
import { ADMIN_E2E } from './setup/entorno-e2e';
import { crearAppE2e, iniciarSesion } from './utilidades/app-e2e';

const CUENTA = {
  username: 'maria.lopez',
  password: 'una frase larga y secreta',
};

/** Cuentas creadas por el administrador, y el login con ellas. */
describe('/cuentas (e2e)', () => {
  let app: NestExpressApplication;
  let tokenAdmin: string;

  const crearCuenta = (
    cuerpo: object,
    token: string | undefined = tokenAdmin,
  ) => {
    const peticion = request(app.getHttpServer())
      .post(`${RUTA_API}/cuentas`)
      .send(cuerpo);
    return token ? peticion.auth(token, { type: 'bearer' }) : peticion;
  };

  const ingresar = (credenciales: { username: string; password: string }) =>
    request(app.getHttpServer())
      .post(`${RUTA_API}/auth/login`)
      .send(credenciales);

  const listar = (
    query: Record<string, string | number> = {},
    token: string = tokenAdmin,
  ) =>
    request(app.getHttpServer())
      .get(`${RUTA_API}/cuentas`)
      .query(query)
      .auth(token, { type: 'bearer' });

  /** Lista (debe responder 200) y devuelve los usuarios de la página. */
  const usuariosListados = async (query: Record<string, string | number>) =>
    ((await listar(query).expect(200)).body as PaginaCuentasDto).data.map(
      (cuenta) => cuenta.username,
    );

  /** Ingresa (debe responder 200) y devuelve la sesión. */
  const sesionDe = async (credenciales: {
    username: string;
    password: string;
  }) => (await ingresar(credenciales).expect(200)).body as AccessTokenDto;

  beforeAll(async () => {
    app = await crearAppE2e();
    tokenAdmin = await iniciarSesion(app);
  });

  beforeEach(async () => {
    await app.get(DataSource).query('TRUNCATE cuentas');
  });

  afterAll(async () => {
    await app.close();
  });

  it('el login del administrador informa el rol admin', async () => {
    expect((await sesionDe(ADMIN_E2E)).rol).toBe('admin');
  });

  it('crea una cuenta (201, sin el hash) y con ella se ingresa como operador', async () => {
    const respuesta = await crearCuenta({
      ...CUENTA,
      username: '  Maria.Lopez ',
    }).expect(201);

    // Exactamente estos campos: el hash de la contraseña nunca sale.
    expect(Object.keys(respuesta.body as object).sort()).toEqual([
      'creadoEn',
      'id',
      'username',
    ]);
    expect(respuesta.body).toMatchObject({ username: CUENTA.username });

    const sesion = await sesionDe(CUENTA);
    expect(sesion.rol).toBe('operador');

    // El operador gestiona usuarios.
    await request(app.getHttpServer())
      .get(`${RUTA_API}/usuarios`)
      .auth(sesion.accessToken, { type: 'bearer' })
      .expect(200);
  });

  it('guarda solo el hash de la contraseña', async () => {
    await crearCuenta(CUENTA).expect(201);

    const [fila] = await app
      .get(DataSource)
      .query<
        Array<{ password_hash: string }>
      >('SELECT password_hash FROM cuentas');
    expect(fila.password_hash).not.toContain(CUENTA.password);
    expect(fila.password_hash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  it('responde 403 si un operador intenta crear una cuenta', async () => {
    await crearCuenta(CUENTA).expect(201);
    const { accessToken } = await sesionDe(CUENTA);

    await crearCuenta(
      { username: 'otra', password: CUENTA.password },
      accessToken,
    )
      .expect(403)
      .expect('Content-Type', /^application\/problem\+json/);
  });

  it('responde 401 sin token', () => {
    return crearCuenta(CUENTA, '').expect(401);
  });

  it('responde 409 si el usuario ya existe, sin importar mayúsculas', async () => {
    await crearCuenta(CUENTA).expect(201);

    const respuesta = await crearCuenta({
      ...CUENTA,
      username: 'MARIA.LOPEZ',
    }).expect(409);

    expect(respuesta.body as ProblemDetailsDto).toMatchObject({
      status: 409,
      detail: 'El usuario maria.lopez ya está en uso',
    });
  });

  it('responde 409 si el usuario es el del administrador', () => {
    return crearCuenta({ ...CUENTA, username: ADMIN_E2E.username }).expect(409);
  });

  it('responde 400 con las reglas incumplidas', async () => {
    const respuesta = await crearCuenta({
      username: 'maría lópez',
      password: 'corta',
    }).expect(400);

    expect((respuesta.body as ProblemDetailsDto).errors).toEqual([
      'El usuario solo puede tener letras sin tildes, números, puntos, guiones y guiones bajos',
      'La contraseña debe tener entre 12 y 128 caracteres',
    ]);
  });

  it('responde 401 al ingresar con la contraseña equivocada de una cuenta', async () => {
    await crearCuenta(CUENTA).expect(201);

    await ingresar({ ...CUENTA, password: 'otra contraseña larga' }).expect(
      401,
    );
  });

  describe('GET /cuentas', () => {
    /** Tres cuentas, creadas en este orden (la fecha de creación sube). */
    beforeEach(async () => {
      for (const username of ['carla', 'ana', 'bruno']) {
        await crearCuenta({ username, password: CUENTA.password }).expect(201);
      }
    });

    it('pagina ordenado por usuario, informa el total y nunca entrega el hash', async () => {
      const respuesta = await listar({ limit: 2 }).expect(200);
      const pagina = respuesta.body as PaginaCuentasDto;

      expect(pagina.data.map((c) => c.username)).toEqual(['ana', 'bruno']);
      expect(pagina.meta).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
      expect(Object.keys(pagina.data[0]).sort()).toEqual([
        'creadoEn',
        'id',
        'username',
      ]);
      await expect(usuariosListados({ limit: 2, page: 2 })).resolves.toEqual([
        'carla',
      ]);
    });

    it('ordena por fecha de creación o por usuario, también al revés', async () => {
      await expect(usuariosListados({ orden: '-creadoEn' })).resolves.toEqual([
        'bruno',
        'ana',
        'carla',
      ]);
      await expect(usuariosListados({ orden: 'creadoEn' })).resolves.toEqual([
        'carla',
        'ana',
        'bruno',
      ]);
      await expect(usuariosListados({ orden: '-username' })).resolves.toEqual([
        'carla',
        'bruno',
        'ana',
      ]);
    });

    it('busca sin distinguir mayúsculas y sin comodines', async () => {
      await expect(usuariosListados({ buscar: 'AN' })).resolves.toEqual([
        'ana',
      ]);
      // "%" se busca literal: no devuelve todo.
      await expect(usuariosListados({ buscar: '%' })).resolves.toEqual([]);
    });

    it('responde 403 a un operador: ver las cuentas es solo para el admin', async () => {
      await crearCuenta(CUENTA).expect(201);
      const { accessToken } = await sesionDe(CUENTA);

      await listar({}, accessToken).expect(403);
    });

    it('rechaza un orden fuera de la lista con 400', async () => {
      const respuesta = await listar({ orden: 'password_hash' }).expect(400);

      expect((respuesta.body as ProblemDetailsDto).errors).toEqual([
        'orden debe ser uno de: username, -username, creadoEn, -creadoEn',
      ]);
    });
  });
});
