import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
// [ANTES] import { NotFoundException } from '@nestjs/common';
import { ConflictException, NotFoundException } from '@nestjs/common';
// [ANTES] import { ObjectLiteral, Repository } from 'typeorm';
// [ANTES] import { ObjectLiteral, QueryFailedError, Repository } from 'typeorm';
import {
  Brackets,
  ObjectLiteral,
  QueryFailedError,
  Repository,
  WhereExpressionBuilder,
} from 'typeorm';
import { UsuariosService } from './usuarios.service';
// [ANTES] import { Usuario } from './usuario.entity';
import { Usuario } from './entities/usuario.entity';

// Fábrica de mocks para Repository<Usuario>
/** QueryBuilder simulado: cada método devuelve el mismo objeto (encadenable). */
const mockQueryBuilder = () => {
  const qb = {
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    where: jest.fn(),
    orWhere: jest.fn(),
    getManyAndCount: jest.fn(),
  };
  for (const metodo of Object.keys(qb) as (keyof typeof qb)[]) {
    if (metodo !== 'getManyAndCount') {
      qb[metodo].mockReturnValue(qb);
    }
  }
  return qb;
};

const mockRepository = () => ({
  // [ANTES] find: jest.fn(),
  createQueryBuilder: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

/** Simula el error que lanza TypeORM cuando Postgres rechaza un duplicado. */
const errorDeUnicidad = () =>
  new QueryFailedError(
    'INSERT INTO "usuarios" ...',
    [],
    Object.assign(new Error('duplicate key value'), { code: '23505' }),
  );

describe('UsuariosService', () => {
  let service: UsuariosService;
  let repo: MockRepository<Usuario>;

  const usuarioBase: Usuario = {
    id: 1,
    nombre: 'Juan Pérez',
    // [ANTES] rut: '12345678-9', van a fallar los test si dejamos ese DV mal
    rut: '12345678-5',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: getRepositoryToken(Usuario), useFactory: mockRepository },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
    repo = module.get(getRepositoryToken(Usuario));
  });

  // ── findAll ──────────────────────────────────────────────────────────────
  describe('findAll', () => {
    // [ANTES] it('debe retornar un arreglo de usuarios', async () => {
    // [ANTES]   repo.find!.mockResolvedValue([usuarioBase]);
    // [ANTES]   const result = await service.findAll();
    // [ANTES]   expect(result).toEqual([usuarioBase]);
    // [ANTES]   expect(repo.find).toHaveBeenCalledTimes(1);
    // [ANTES] });
    // [ANTES]
    // [ANTES] it('debe retornar arreglo vacío cuando no hay usuarios', async () => {
    // [ANTES]   repo.find!.mockResolvedValue([]);
    // [ANTES]   expect(await service.findAll()).toEqual([]);
    // [ANTES] });
    let qb: ReturnType<typeof mockQueryBuilder>;

    beforeEach(() => {
      qb = mockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
    });

    /** Ejecuta la condición agrupada (Brackets) para ver qué filtros arma. */
    const filtrosAplicados = () => {
      const [brackets] = qb.where.mock.calls[0] as [Brackets];
      const condicion = { where: jest.fn(), orWhere: jest.fn() };
      condicion.where.mockReturnValue(condicion);
      condicion.orWhere.mockReturnValue(condicion);
      brackets.whereFactory(condicion as unknown as WhereExpressionBuilder);
      return condicion;
    };

    it('debe devolver la página pedida con sus metadatos', async () => {
      qb.getManyAndCount.mockResolvedValue([[usuarioBase], 41]);

      const pagina = await service.findAll({ page: 3, limit: 20 });

      expect(qb.skip).toHaveBeenCalledWith(40);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(qb.orderBy).toHaveBeenCalledWith('usuario.nombre', 'ASC');
      expect(pagina).toEqual({
        data: [usuarioBase],
        meta: { page: 3, limit: 20, total: 41, totalPages: 3 },
      });
    });

    it('no debe filtrar si no hay texto de búsqueda', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      const pagina = await service.findAll({
        page: 1,
        limit: 20,
        buscar: '  ',
      });

      expect(qb.where).not.toHaveBeenCalled();
      expect(pagina.meta.totalPages).toBe(0);
    });

    it('debe buscar por nombre sin tildes y por RUT sin puntos ni guion', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, limit: 20, buscar: '12.345.678-k' });

      const condicion = filtrosAplicados();
      expect(condicion.where).toHaveBeenCalledWith(
        'unaccent(usuario.nombre) ILIKE unaccent(:nombre)',
        { nombre: '%12.345.678-k%' },
      );
      expect(condicion.orWhere).toHaveBeenCalledWith(
        "replace(usuario.rut, '-', '') ILIKE :rut",
        { rut: '%12345678K%' },
      );
    });

    it('debe escapar los comodines de LIKE del texto buscado', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, limit: 20, buscar: '100%_x' });

      expect(filtrosAplicados().where).toHaveBeenCalledWith(
        expect.any(String),
        { nombre: '%100\\%\\_x%' },
      );
    });

    it('no debe filtrar por RUT si el texto no tiene caracteres útiles', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, limit: 20, buscar: '.' });

      expect(filtrosAplicados().orWhere).not.toHaveBeenCalled();
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('debe retornar el usuario si existe', async () => {
      repo.findOneBy!.mockResolvedValue(usuarioBase);
      const result = await service.findOne(1);
      expect(result).toEqual(usuarioBase);
      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      repo.findOneBy!.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Usuario con id 99 no encontrado'),
      );
    });
  });

  // ── create ───────────────────────────────────────────────────────────────
  describe('create', () => {
    it('debe crear y retornar el nuevo usuario', async () => {
      // [ANTES] const dto = { nombre: 'María López', rut: '98765432-1' }; IDEM, si lo dejamos mal el DV del RUT, fallan los test
      const dto = { nombre: 'María López', rut: '98765432-5' };
      const creado = { id: 2, ...dto };
      repo.create!.mockReturnValue(creado);
      repo.save!.mockResolvedValue(creado);

      const result = await service.create(dto);
      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalledWith(creado);
      expect(result).toEqual(creado);
    });

    it('debe lanzar ConflictException si el RUT ya existe', async () => {
      const dto = { nombre: 'María López', rut: '12345678-5' };
      repo.create!.mockReturnValue(dto);
      repo.save!.mockRejectedValue(errorDeUnicidad());

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException('Ya existe un usuario con el RUT 12345678-5'),
      );
    });

    it('debe propagar sin cambios cualquier otro error de base de datos', async () => {
      const errorDesconocido = new Error('conexión perdida');
      repo.create!.mockReturnValue({});
      repo.save!.mockRejectedValue(errorDesconocido);

      await expect(
        service.create({ nombre: 'X', rut: '12345678-5' }),
      ).rejects.toBe(errorDesconocido);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────
  describe('update', () => {
    it('debe actualizar y retornar el usuario modificado', async () => {
      const dto = { nombre: 'Juan Pablo Pérez' };
      const actualizado = { ...usuarioBase, ...dto };
      repo.findOneBy!.mockResolvedValue({ ...usuarioBase });
      repo.save!.mockResolvedValue(actualizado);

      const result = await service.update(1, dto);
      expect(result).toEqual(actualizado);
      expect(repo.save).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      repo.findOneBy!.mockResolvedValue(null);
      await expect(service.update(99, { nombre: 'Nuevo' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar ConflictException si el nuevo RUT ya pertenece a otro usuario', async () => {
      repo.findOneBy!.mockResolvedValue({ ...usuarioBase });
      repo.save!.mockRejectedValue(errorDeUnicidad());

      await expect(service.update(1, { rut: '11111111-1' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('debe eliminar el usuario correctamente', async () => {
      repo.findOneBy!.mockResolvedValue(usuarioBase);
      repo.remove!.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(repo.remove).toHaveBeenCalledWith(usuarioBase);
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      repo.findOneBy!.mockResolvedValue(null);
      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
    });
  });
});
