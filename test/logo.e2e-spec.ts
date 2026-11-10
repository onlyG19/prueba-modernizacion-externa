import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { LIMITE_LOGO, MENSAJE_LIMITE } from '../src/config/limites';
import type { VisitCountDto } from '../src/modules/logo/dto/visit-count.dto';
import { RUTA_API } from '../src/config/app-setup';
import { crearAppE2e } from './utilidades/app-e2e';

/** El logo y su contador de visitas, guardado en Redis (con contraseña). */
describe('/logo (e2e)', () => {
  let app: NestExpressApplication;

  async function visitas(servidor: NestExpressApplication): Promise<number> {
    const respuesta = await request(servidor.getHttpServer())
      // [ANTES] .get('/logo/count')
      .get(`${RUTA_API}/logo/count`)
      .expect(200);
    return (respuesta.body as VisitCountDto).count;
  }

  beforeAll(async () => {
    app = await crearAppE2e();
  });

  afterAll(async () => {
    await app.close();
  });

  it('devuelve la imagen y cuenta cada visita en Redis', async () => {
    const antes = await visitas(app);

    const respuesta = await request(app.getHttpServer())
      // [ANTES] .get('/logo')
      .get(`${RUTA_API}/logo`)
      .expect(200)
      .expect('Content-Type', /^image\//);

    expect(respuesta.headers['x-request-count']).toBe(String(antes + 1));
    expect(await visitas(app)).toBe(antes + 1);
  });

  it(`aplica su propio límite: la visita ${LIMITE_LOGO.limit + 1} en un minuto responde 429 y no suma`, async () => {
    // App nueva: el conteo del límite (en memoria) parte de cero.
    const appNueva = await crearAppE2e();
    // [ANTES] const pedirLogo = () => request(appNueva.getHttpServer()).get('/logo');
    const pedirLogo = () =>
      request(appNueva.getHttpServer()).get(`${RUTA_API}/logo`);
    try {
      for (let i = 0; i < LIMITE_LOGO.limit; i++) {
        await pedirLogo().expect(200);
      }
      const total = await visitas(appNueva);

      const bloqueada = await pedirLogo().expect(429);

      expect(bloqueada.body).toMatchObject({
        status: 429,
        detail: MENSAJE_LIMITE,
      });
      // La petición rechazada no infla el contador.
      expect(await visitas(appNueva)).toBe(total);
    } finally {
      await appNueva.close();
    }
  });
});
