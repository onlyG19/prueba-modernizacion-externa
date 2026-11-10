// [ANTES] import { Test, TestingModule } from '@nestjs/testing';
// [ANTES] import { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
// [ANTES] import { App } from 'supertest/types';
// [ANTES] import { AppModule } from './../src/app.module';
import { RUTA_API } from '../src/config/app-setup';
import { ORIGEN_E2E } from './setup/entorno-e2e';
import { crearAppE2e } from './utilidades/app-e2e';

// [ANTES] describe('AppController (e2e)', () => {
// [ANTES] /**
// [ANTES]  * La API completa (todos los módulos, filtro y guards globales) contra
// [ANTES]  * Postgres y Redis reales: requiere `docker compose up -d postgres redis` y el
// [ANTES]  * `.env` de la raíz.
// [ANTES]  */
/**
 * La API completa (todos los módulos, filtro y guards globales) contra
 * Postgres y Redis en contenedores desechables (ver setup/global-setup.ts):
 * solo requiere Docker.
 */
describe('API (e2e)', () => {
  // [ANTES] let app: INestApplication<App>;
  let app: NestExpressApplication;

  // [ANTES] beforeEach(async () => {
  // Arrancar la aplicación completa es lento: una vez para todo el archivo.
  beforeAll(async () => {
    // [ANTES] const moduleFixture: TestingModule = await Test.createTestingModule({
    // [ANTES]   imports: [AppModule],
    // [ANTES] }).compile();
    // [ANTES]
    // [ANTES] app = moduleFixture.createNestApplication();
    // [ANTES] await app.init();
    app = await crearAppE2e();
  });

  // [ANTES] it('/ (GET)', () => {
  // [ANTES]   return request(app.getHttpServer())
  // [ANTES]     .get('/')
  // [ANTES]     .expect(200)
  // [ANTES]     .expect('Hello World!');
  // [ANTES] });
  it('GET /health responde 200 con la base de datos y Redis arriba', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up', redis: 'up' });
  });

  it('una ruta inexistente responde 404 como Problem Details', () => {
    return request(app.getHttpServer())
      .get('/no-existe')
      .expect(404)
      .expect('Content-Type', /^application\/problem\+json/)
      .expect(({ body }) => {
        expect(body).toMatchObject({ status: 404, instance: '/no-existe' });
      });
  });

  it('GET /usuarios sin token responde 401', () => {
    // [ANTES] return request(app.getHttpServer()).get('/usuarios').expect(401);
    return request(app.getHttpServer()).get(`${RUTA_API}/usuarios`).expect(401);
  });

  it('aplica la configuración de main.ts: cabeceras de seguridad y CORS', () => {
    return (
      request(app.getHttpServer())
        .get('/health')
        .set('Origin', ORIGEN_E2E)
        // helmet
        .expect('X-Content-Type-Options', 'nosniff')
        // CORS: solo el origen configurado, y las cabeceras propias legibles
        .expect('Access-Control-Allow-Origin', ORIGEN_E2E)
        // [ANTES] .expect('Access-Control-Expose-Headers', 'X-Request-Count,X-Request-Id')
        .expect(
          'Access-Control-Expose-Headers',
          // [ANTES] 'Location,X-Request-Count,X-Request-Id',
          'ETag,Location,X-Request-Count,X-Request-Id',
        )
    );
  });

  it('identifica cada petición con X-Request-Id y respeta uno válido que ya venga', async () => {
    const nueva = await request(app.getHttpServer()).get('/health').expect(200);
    expect(nueva.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );

    // nginx asigna el suyo: la API lo conserva para correlacionar ambos logs.
    await request(app.getHttpServer())
      .get('/health')
      .set('X-Request-Id', 'b7e1c2d4f5a6')
      .expect('X-Request-Id', 'b7e1c2d4f5a6');
  });

  // [ANTES] afterEach(async () => {
  afterAll(async () => {
    await app.close();
  });
});
