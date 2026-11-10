import { INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { ProblemDetailsFilter } from '../common/filters/problem-details.filter';
import { HealthController } from '../health/health.controller';
import { REDIS_CLIENT } from '../infrastructure/redis/redis.provider';
import { AuthController } from '../modules/auth/auth.controller';
import { AuthService } from '../modules/auth/auth.service';
import { LIMITE_GENERAL, LIMITE_LOGIN, MENSAJE_LIMITE } from './limites';

/**
 * Integración del límite de peticiones: una app Nest real (guard global,
 * decoradores por ruta y filtro de errores), con los servicios simulados.
 */
describe('Límite de peticiones', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ name: 'default', ...LIMITE_GENERAL }],
          errorMessage: MENSAJE_LIMITE,
        }),
      ],
      controllers: [AuthController, HealthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockResolvedValue({
              accessToken: 't',
              tokenType: 'Bearer',
              expiresIn: 3600,
            }),
          },
        },
        { provide: DataSource, useValue: { query: jest.fn() } },
        { provide: REDIS_CLIENT, useValue: { ping: jest.fn() } },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(() => app.close());

  const login = () =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'x' });

  it(`debe aceptar ${LIMITE_LOGIN.limit} intentos de login por minuto y rechazar el siguiente con 429`, async () => {
    for (let intento = 0; intento < LIMITE_LOGIN.limit; intento++) {
      await login().expect(200);
    }

    const rechazado = await login().expect(429);

    expect(rechazado.headers['content-type']).toContain(
      'application/problem+json',
    );
    expect(rechazado.headers['retry-after']).toBeDefined();
    expect(rechazado.body).toMatchObject({
      status: 429,
      title: 'Too Many Requests',
      detail: MENSAJE_LIMITE,
    });
  });

  it('no debe limitar /health (lo consultan los healthchecks)', async () => {
    for (let i = 0; i < LIMITE_GENERAL.limit + 5; i++) {
      await request(app.getHttpServer()).get('/health').expect(200);
    }
  });
});
