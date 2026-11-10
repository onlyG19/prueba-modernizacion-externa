import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
// [ANTES] import { NotFoundException } from '@nestjs/common';
import { ConflictException, NotFoundException } from '@nestjs/common';
// [ANTES] import { ObjectLiteral, Repository } from 'typeorm';
import { ObjectLiteral, QueryFailedError, Repository } from 'typeorm';
import { UsuariosService } from './usuarios.service';
// [ANTES] import { Usuario } from './usuario.entity';
import { Usuario } from './entities/usuario.entity';

// Fábrica de mocks para Repository<Usuario>
const mockRepository = () => ({
  find: jest.fn(),
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
    it('debe retornar un arreglo de usuarios', async () => {
      repo.find!.mockResolvedValue([usuarioBase]);
      const result = await service.findAll();
      expect(result).toEqual([usuarioBase]);
      expect(repo.find).toHaveBeenCalledTimes(1);
    });

    it('debe retornar arreglo vacío cuando no hay usuarios', async () => {
      repo.find!.mockResolvedValue([]);
      expect(await service.findAll()).toEqual([]);
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
