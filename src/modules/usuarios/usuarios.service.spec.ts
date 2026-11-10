import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
// [ANTES] import { NotFoundException } from '@nestjs/common';
// [ANTES] import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  ConflictException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
// [ANTES] import { ObjectLiteral, Repository } from 'typeorm';
// [ANTES] import { ObjectLiteral, QueryFailedError, Repository } from 'typeorm';
import {
  Brackets,
  ObjectLiteral,
  QueryFailedError,
  Repository,
  WhereExpressionBuilder,
} from 'typeorm';
import {
  MENSAJE_VERSION_DESACTUALIZADA,
  UsuariosService,
} from './usuarios.service';
// [ANTES] import { Usuario } from './usuario.entity';
import { Usuario } from './entities/usuario.entity';

/** Ids UUID de prueba (los usuarios ya no tienen ids seriales). */
const ID = '0b5f2c1e-7d4a-4f3b-9a61-2e8c4d7f1a90';
const OTRO_ID = '5c3d9e2a-1f4b-4c6d-8e7f-9a0b1c2d3e4f';
const ID_INEXISTENTE = 'f0e1d2c3-b4a5-4968-8776-655443322110';

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
    update: jest.fn(),
    set: jest.fn(),
    andWhere: jest.fn(),
    execute: jest.fn(),
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
    // [ANTES] id: 1,
    id: ID,
    nombre: 'Juan Pérez',
    // [ANTES] rut: '12345678-9', van a fallar los test si dejamos ese DV mal
    rut: '12345678-5',
    creadoEn: new Date('2026-11-10T14:03:00.000Z'),
    actualizadoEn: new Date('2026-11-10T14:03:00.000Z'),
    version: 1,
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

    it.each([
      ['-nombre', 'usuario.nombre', 'DESC'],
      ['creadoEn', 'usuario.creadoEn', 'ASC'],
      ['-creadoEn', 'usuario.creadoEn', 'DESC'],
    ] as const)(
      'debe ordenar según %s, con el id como desempate',
      async (orden, columna, direccion) => {
        qb.getManyAndCount.mockResolvedValue([[], 0]);

        await service.findAll({ page: 1, limit: 20, orden });

        expect(qb.orderBy).toHaveBeenCalledWith(columna, direccion);
        expect(qb.addOrderBy).toHaveBeenCalledWith('usuario.id', 'ASC');
      },
    );

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
      // [ANTES] const result = await service.findOne(1);
      const result = await service.findOne(ID);
      expect(result).toEqual(usuarioBase);
      // [ANTES] expect(repo.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(repo.findOneBy).toHaveBeenCalledWith({ id: ID });
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      repo.findOneBy!.mockResolvedValue(null);
      // [ANTES] await expect(service.findOne(99)).rejects.toThrow(
      await expect(service.findOne(ID_INEXISTENTE)).rejects.toThrow(
        // [ANTES] new NotFoundException('Usuario con id 99 no encontrado'),
        new NotFoundException(`Usuario con id ${ID_INEXISTENTE} no encontrado`),
      );
    });
  });

  // ── create ───────────────────────────────────────────────────────────────
  describe('create', () => {
    it('debe crear y retornar el nuevo usuario', async () => {
      // [ANTES] const dto = { nombre: 'María López', rut: '98765432-1' }; IDEM, si lo dejamos mal el DV del RUT, fallan los test
      const dto = { nombre: 'María López', rut: '98765432-5' };
      // [ANTES] const creado = { id: 2, ...dto };
      const creado = { id: OTRO_ID, ...dto };
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
  // [ANTES] describe('update', () => {
  // [ANTES]   it('debe actualizar y retornar el usuario modificado', async () => {
  // [ANTES]     const dto = { nombre: 'Juan Pablo Pérez' };
  // [ANTES]     const actualizado = { ...usuarioBase, ...dto };
  // [ANTES]     repo.findOneBy!.mockResolvedValue({ ...usuarioBase });
  // [ANTES]     repo.save!.mockResolvedValue(actualizado);
  // [ANTES]
  // [ANTES]     // [ANTES] const result = await service.update(1, dto);
  // [ANTES]     const result = await service.update(ID, dto);
  // [ANTES]     expect(result).toEqual(actualizado);
  // [ANTES]     expect(repo.save).toHaveBeenCalled();
  // [ANTES]   });
  // [ANTES]
  // [ANTES]   it('debe lanzar NotFoundException si el usuario no existe', async () => {
  // [ANTES]     repo.findOneBy!.mockResolvedValue(null);
  // [ANTES]     // [ANTES] await expect(service.update(99, { nombre: 'Nuevo' })).rejects.toThrow(
  // [ANTES]     await expect(
  // [ANTES]       service.update(ID_INEXISTENTE, { nombre: 'Nuevo' }),
  // [ANTES]     ).rejects.toThrow(NotFoundException);
  // [ANTES]   });
  // [ANTES]
  // [ANTES]   it('debe lanzar ConflictException si el nuevo RUT ya pertenece a otro usuario', async () => {
  // [ANTES]     repo.findOneBy!.mockResolvedValue({ ...usuarioBase });
  // [ANTES]     repo.save!.mockRejectedValue(errorDeUnicidad());
  // [ANTES]
  // [ANTES]     // [ANTES] await expect(service.update(1, { rut: '11111111-1' })).rejects.toThrow(
  // [ANTES]     await expect(service.update(ID, { rut: '11111111-1' })).rejects.toThrow(
  // [ANTES]       ConflictException,
  // [ANTES]     );
  // [ANTES]   });
  // [ANTES] });
  describe('update', () => {
    let qb: ReturnType<typeof mockQueryBuilder>;

    beforeEach(() => {
      qb = mockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
    });

    it('debe actualizar solo los campos enviados y devolver el usuario recargado', async () => {
      const recargado = {
        ...usuarioBase,
        nombre: 'Juan Pablo Pérez',
        version: 2,
      };
      repo.findOneBy!.mockResolvedValueOnce(usuarioBase);
      repo.findOneBy!.mockResolvedValueOnce(recargado);
      qb.execute.mockResolvedValue({ affected: 1 });

      const result = await service.update(ID, { nombre: 'Juan Pablo Pérez' });

      expect(qb.set).toHaveBeenCalledWith({ nombre: 'Juan Pablo Pérez' });
      expect(qb.where).toHaveBeenCalledWith('id = :id', { id: ID });
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual(recargado);
    });

    it('con If-Match, debe exigir la versión en el mismo UPDATE (atómico)', async () => {
      repo.findOneBy!.mockResolvedValue(usuarioBase);
      qb.execute.mockResolvedValue({ affected: 1 });

      await service.update(ID, { nombre: 'Otro' }, [1]);

      expect(qb.andWhere).toHaveBeenCalledWith('version IN (:...versiones)', {
        versiones: [1],
      });
    });

    it('debe responder 412 si otro cambio subió la versión antes', async () => {
      repo.findOneBy!.mockResolvedValue(usuarioBase);
      qb.execute.mockResolvedValue({ affected: 0 });

      await expect(service.update(ID, { nombre: 'Otro' }, [1])).rejects.toThrow(
        new PreconditionFailedException(MENSAJE_VERSION_DESACTUALIZADA),
      );
    });

    it('debe responder 412 sin tocar la base si If-Match no traía versiones válidas', async () => {
      repo.findOneBy!.mockResolvedValue(usuarioBase);

      await expect(service.update(ID, { nombre: 'Otro' }, [])).rejects.toThrow(
        PreconditionFailedException,
      );
      expect(qb.execute).not.toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      repo.findOneBy!.mockResolvedValue(null);

      await expect(
        service.update(ID_INEXISTENTE, { nombre: 'Nuevo' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar NotFoundException si lo eliminaron entre la lectura y el UPDATE', async () => {
      repo.findOneBy!.mockResolvedValue(usuarioBase);
      qb.execute.mockResolvedValue({ affected: 0 });

      await expect(service.update(ID, { nombre: 'Otro' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar ConflictException si el nuevo RUT ya pertenece a otro usuario', async () => {
      repo.findOneBy!.mockResolvedValue(usuarioBase);
      qb.execute.mockRejectedValue(errorDeUnicidad());

      await expect(service.update(ID, { rut: '11111111-1' })).rejects.toThrow(
        new ConflictException('Ya existe un usuario con el RUT 11111111-1'),
      );
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('debe eliminar el usuario correctamente', async () => {
      repo.findOneBy!.mockResolvedValue(usuarioBase);
      repo.remove!.mockResolvedValue(undefined);

      // [ANTES] await expect(service.remove(1)).resolves.toBeUndefined();
      await expect(service.remove(ID)).resolves.toBeUndefined();
      expect(repo.remove).toHaveBeenCalledWith(usuarioBase);
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      repo.findOneBy!.mockResolvedValue(null);
      // [ANTES] await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      await expect(service.remove(ID_INEXISTENTE)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
