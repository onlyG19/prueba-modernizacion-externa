import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import type { ProblemDetailsDto } from '../src/common/dto/problem-details.dto';
import type { PaginaUsuariosDto } from '../src/modules/usuarios/dto/pagina-usuarios.dto';
// [ANTES] import type { Usuario } from '../src/modules/usuarios/entities/usuario.entity';
import type { UsuarioDto } from '../src/modules/usuarios/dto/usuario.dto';
import { crearAppE2e, iniciarSesion } from './utilidades/app-e2e';

/** Un usuario tal como llega en el JSON: las fechas, como texto ISO 8601. */
type UsuarioJson = Omit<UsuarioDto, 'creadoEn' | 'actualizadoEn'> & {
  creadoEn: string;
  actualizadoEn: string;
};

/**
 * El CRUD de usuarios de punta a punta: HTTP, validación, guard JWT, servicio,
 * TypeORM y Postgres (con `unaccent` y la restricción UNIQUE del RUT).
 */
describe('/usuarios (e2e)', () => {
  let app: NestExpressApplication;
  let token: string;

  /** Petición autenticada como el administrador de los e2e. */
  const api = {
    get: (ruta: string) =>
      request(app.getHttpServer()).get(ruta).auth(token, { type: 'bearer' }),
    post: (ruta: string) =>
      request(app.getHttpServer()).post(ruta).auth(token, { type: 'bearer' }),
    patch: (ruta: string) =>
      request(app.getHttpServer()).patch(ruta).auth(token, { type: 'bearer' }),
    delete: (ruta: string) =>
      request(app.getHttpServer()).delete(ruta).auth(token, { type: 'bearer' }),
  };

  // [ANTES] async function crear(nombre: string, rut: string): Promise<Usuario> {
  async function crear(nombre: string, rut: string): Promise<UsuarioJson> {
    const respuesta = await api
      .post('/usuarios')
      .send({ nombre, rut })
      .expect(201);
    // [ANTES] return respuesta.body as Usuario;
    return respuesta.body as UsuarioJson;
  }

  async function buscar(texto: string): Promise<PaginaUsuariosDto> {
    const respuesta = await api
      .get('/usuarios')
      .query({ buscar: texto })
      .expect(200);
    return respuesta.body as PaginaUsuariosDto;
  }

  const nombres = (pagina: PaginaUsuariosDto) =>
    pagina.data.map((usuario) => usuario.nombre);

  beforeAll(async () => {
    app = await crearAppE2e();
    token = await iniciarSesion(app);
  });

  beforeEach(async () => {
    // La base es desechable (contenedor): cada test parte con la tabla vacía.
    await app.get(DataSource).query('TRUNCATE usuarios RESTART IDENTITY');
  });

  afterAll(async () => {
    await app.close();
  });

  it('recorre el ciclo completo: crear, leer, actualizar y eliminar', async () => {
    const creado = await crear('  Ana   Rojas ', '11.111.111-1');
    // Se guarda normalizado: sin espacios de sobra y el RUT sin puntos.
    expect(creado).toEqual({
      id: expect.any(Number) as number,
      nombre: 'Ana Rojas',
      rut: '11111111-1',
      creadoEn: expect.any(String) as string,
      actualizadoEn: creado.creadoEn,
    });

    await api.get(`/usuarios/${creado.id}`).expect(200, creado);

    // [ANTES] const actualizado = await api
    const respuesta = await api
      .patch(`/usuarios/${creado.id}`)
      .send({ nombre: 'Ana María Rojas' })
      .expect(200);
    // [ANTES] expect(actualizado.body).toEqual({ ...creado, nombre: 'Ana María Rojas' });
    const actualizado = respuesta.body as UsuarioJson;
    expect(actualizado).toEqual({
      ...creado,
      nombre: 'Ana María Rojas',
      actualizadoEn: expect.any(String) as string,
    });
    // La fecha de registro se conserva; la del último cambio avanza.
    expect(Date.parse(actualizado.actualizadoEn)).toBeGreaterThan(
      Date.parse(creado.actualizadoEn),
    );

    await api.delete(`/usuarios/${creado.id}`).expect(204);
    await api
      .get(`/usuarios/${creado.id}`)
      .expect(404)
      .expect('Content-Type', /^application\/problem\+json/);
  });

  it('responde 409 si el RUT ya existe, aunque venga escrito de otra forma', async () => {
    await crear('Primera Persona', '10.000.013-K');

    const respuesta = await api
      .post('/usuarios')
      .send({ nombre: 'Segunda Persona', rut: '10000013k' })
      .expect(409);

    expect(respuesta.body).toMatchObject({
      status: 409,
      detail: 'Ya existe un usuario con el RUT 10000013-K',
    });
  });

  it('rechaza datos inválidos con 400 y explica cada error', async () => {
    const respuesta = await api
      .post('/usuarios')
      .send({ nombre: '   ', rut: '12.345.678-9' })
      .expect(400);

    const problema = respuesta.body as ProblemDetailsDto;
    expect(problema.detail).toBe('La solicitud tiene datos inválidos.');
    expect(problema.errors).toEqual(
      expect.arrayContaining([
        'El nombre no puede estar vacío',
        'rut debe ser un RUT válido (ej: 12.345.678-5)',
      ]),
    );
  });

  it('rechaza un PATCH sin campos o con null (antes: 200 y 500)', async () => {
    const { id } = await crear('Ana Rojas', '11.111.111-1');

    await api
      .patch(`/usuarios/${id}`)
      .send({})
      .expect(400)
      .expect(({ body }) => {
        expect((body as ProblemDetailsDto).detail).toBe(
          'Envía al menos un campo para actualizar.',
        );
      });
    await api.patch(`/usuarios/${id}`).send({ nombre: null }).expect(400);
  });

  it('pagina ordenado por nombre e informa el total', async () => {
    await crear('Carla Soto', '11.111.111-1');
    await crear('Ana Rojas', '22.222.222-2');
    await crear('Beatriz Díaz', '33.333.333-3');

    const primera = await api.get('/usuarios?limit=2').expect(200);
    const segunda = await api.get('/usuarios?page=2&limit=2').expect(200);

    const [pagina1, pagina2] = [primera.body, segunda.body] as [
      PaginaUsuariosDto,
      PaginaUsuariosDto,
    ];
    expect(nombres(pagina1)).toEqual(['Ana Rojas', 'Beatriz Díaz']);
    expect(pagina1.meta).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
    expect(nombres(pagina2)).toEqual(['Carla Soto']);
  });

  it('busca en Postgres: nombre sin tildes, RUT con o sin puntos, sin comodines', async () => {
    await crear('José Núñez', '11.111.111-1');
    await crear('María López', '22.222.222-2');

    expect(nombres(await buscar('jose nunez'))).toEqual(['José Núñez']);
    expect(nombres(await buscar('22.222'))).toEqual(['María López']);
    expect(nombres(await buscar('22222222-2'))).toEqual(['María López']);
    // `%` y `_` se buscan literalmente: no actúan como comodines de LIKE.
    expect((await buscar('%')).meta.total).toBe(0);
    expect((await buscar('_')).meta.total).toBe(0);
  });

  it('rechaza parámetros inválidos con 400', async () => {
    await api.get('/usuarios?limit=101').expect(400);
    await api.get('/usuarios/abc').expect(400);
  });
});
