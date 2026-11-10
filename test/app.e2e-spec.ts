import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// [ANTES] describe('AppController (e2e)', () => {
/**
 * La API completa (todos los módulos, filtro y guards globales) contra
 * Postgres y Redis reales: requiere `docker compose up -d postgres redis` y el
 * `.env` de la raíz.
 */
describe('API (e2e)', () => {
  let app: INestApplication<App>;

  // [ANTES] beforeEach(async () => {
  // Arrancar la aplicación completa es lento: una vez para todo el archivo.
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
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
    return request(app.getHttpServer()).get('/usuarios').expect(401);
  });

  // [ANTES] afterEach(async () => {
  afterAll(async () => {
    await app.close();
  });
});
