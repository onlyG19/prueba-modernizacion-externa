import { INestApplication } from '@nestjs/common';
import { OpenAPIObject } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { AuthController } from '../modules/auth/auth.controller';
import { AuthService } from '../modules/auth/auth.service';
import { LogoController } from '../modules/logo/logo.controller';
import { LogoService } from '../modules/logo/logo.service';
import { VisitCounterService } from '../modules/logo/visit-counter.service';
import { UsuariosController } from '../modules/usuarios/usuarios.controller';
import { UsuariosService } from '../modules/usuarios/usuarios.service';
import { createOpenApiDocument } from './swagger';

/**
 * Verifica el contrato que publica la documentación. Los esquemas de los DTOs
 * los genera el plugin del CLI al compilar (no corre en Jest); aquí se prueba
 * lo que declaran los decoradores: seguridad y respuestas de error.
 */
describe('createOpenApiDocument', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsuariosController, AuthController, LogoController],
      providers: [
        { provide: UsuariosService, useValue: {} },
        { provide: AuthService, useValue: {} },
        { provide: LogoService, useValue: {} },
        { provide: VisitCounterService, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    document = createOpenApiDocument(app);
  });

  afterAll(() => app.close());

  const operacion = (
    ruta: string,
    metodo: 'get' | 'post' | 'patch' | 'delete',
  ) => document.paths[ruta][metodo]!;

  it('debe declarar el esquema de autenticación Bearer JWT', () => {
    expect(document.components?.securitySchemes?.bearer).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
  });

  it.each([
    ['/usuarios', 'get'],
    ['/usuarios', 'post'],
    ['/usuarios/{id}', 'get'],
    ['/usuarios/{id}', 'patch'],
    ['/usuarios/{id}', 'delete'],
  ] as const)(
    'debe marcar %s %s como protegido y documentar el 401',
    (ruta, metodo) => {
      const op = operacion(ruta, metodo);

      expect(op.security).toEqual([{ bearer: [] }]);
      expect(op.responses).toHaveProperty('401');
    },
  );

  it.each([
    ['/auth/login', 'post'],
    ['/logo', 'get'],
    ['/logo/visitas', 'get'],
  ] as const)('debe dejar %s %s como público', (ruta, metodo) => {
    expect(operacion(ruta, metodo).security).toBeUndefined();
  });

  it('debe documentar el 409 por RUT duplicado al crear y al actualizar', () => {
    expect(operacion('/usuarios', 'post').responses).toHaveProperty('409');
    expect(operacion('/usuarios/{id}', 'patch').responses).toHaveProperty(
      '409',
    );
  });

  it('debe documentar que /logo devuelve una imagen y no JSON', () => {
    const respuesta = operacion('/logo', 'get').responses['200'];

    expect(respuesta).toHaveProperty(['content', 'image/svg+xml']);
    expect(respuesta).toHaveProperty(['content', 'image/png']);
    expect(respuesta).not.toHaveProperty(['content', 'application/json']);
  });
});
