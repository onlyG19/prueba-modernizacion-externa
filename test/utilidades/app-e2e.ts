import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp, RUTA_API } from '../../src/config/app-setup';
import type { AccessTokenDto } from '../../src/modules/auth/dto/access-token.dto';
import { ADMIN_E2E } from '../setup/entorno-e2e';

/**
 * La API completa, configurada igual que en `main.ts` (proxy, helmet, CORS y
 * validación), pero sin escuchar en un puerto: supertest le habla directo.
 *
 * @remarks Cada instancia tiene su propio conteo de rate limiting (en
 * memoria): un test que agota un límite lo hace con una app nueva.
 */
export async function crearAppE2e(): Promise<NestExpressApplication> {
  const modulo = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = modulo.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return app;
}

/** Inicia sesión como el administrador de los e2e y devuelve el token. */
export async function iniciarSesion(
  app: NestExpressApplication,
): Promise<string> {
  const respuesta = await request(app.getHttpServer())
    .post(`${RUTA_API}/auth/login`)
    .send(ADMIN_E2E)
    .expect(200);
  return (respuesta.body as AccessTokenDto).accessToken;
}
