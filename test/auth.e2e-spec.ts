import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { LIMITE_LOGIN, MENSAJE_LIMITE } from '../src/config/limites';
import { RUTA_API } from '../src/config/app-setup';
import { ADMIN_E2E } from './setup/entorno-e2e';
import { crearAppE2e, iniciarSesion } from './utilidades/app-e2e';

/** Login, token JWT y límite de intentos contra fuerza bruta. */
describe('/auth (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await crearAppE2e();
  });

  afterAll(async () => {
    await app.close();
  });

  it('entrega un token con las credenciales correctas, y el token abre la API', async () => {
    const token = await iniciarSesion(app);

    await request(app.getHttpServer())
      // [ANTES] .get('/usuarios')
      .get(`${RUTA_API}/usuarios`)
      .auth(token, { type: 'bearer' })
      .expect(200);
  });

  it('responde 401 como Problem Details con una contraseña incorrecta', () => {
    return (
      request(app.getHttpServer())
        // [ANTES] .post('/auth/login')
        .post(`${RUTA_API}/auth/login`)
        .send({ ...ADMIN_E2E, password: 'incorrecta' })
        .expect(401)
        .expect('Content-Type', /^application\/problem\+json/)
    );
  });

  it(`frena la fuerza bruta: el intento ${LIMITE_LOGIN.limit + 1} en un minuto responde 429`, async () => {
    // App nueva: el conteo de intentos (en memoria) parte de cero.
    const appNueva = await crearAppE2e();
    const intentar = () =>
      request(appNueva.getHttpServer())
        // [ANTES] .post('/auth/login')
        .post(`${RUTA_API}/auth/login`)
        .send({ ...ADMIN_E2E, password: 'incorrecta' });
    try {
      for (let i = 0; i < LIMITE_LOGIN.limit; i++) {
        await intentar().expect(401);
      }

      const bloqueado = await intentar().expect(429);

      expect(bloqueado.body).toMatchObject({
        status: 429,
        detail: MENSAJE_LIMITE,
      });
      expect(bloqueado.headers['retry-after']).toMatch(/^\d+$/);
    } finally {
      await appNueva.close();
    }
  });
});
