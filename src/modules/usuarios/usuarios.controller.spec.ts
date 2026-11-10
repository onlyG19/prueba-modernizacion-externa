import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
// [ANTES] import { Usuario } from './usuario.entity';
import type { Request, Response } from 'express';
import { Usuario } from './entities/usuario.entity';

/** Ids UUID de prueba (los usuarios ya no tienen ids seriales). */
const ID = '0b5f2c1e-7d4a-4f3b-9a61-2e8c4d7f1a90';
const OTRO_ID = '5c3d9e2a-1f4b-4c6d-8e7f-9a0b1c2d3e4f';
const ID_INEXISTENTE = 'f0e1d2c3-b4a5-4968-8776-655443322110';

const mockUsuariosService = () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
});

describe('UsuariosController', () => {
  let controller: UsuariosController;
  let service: ReturnType<typeof mockUsuariosService>;

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

  /** Respuesta de Express simulada: registra las cabeceras que se ponen. */
  const respuesta = () =>
    ({ setHeader: jest.fn(), location: jest.fn() }) as unknown as Response & {
      setHeader: jest.Mock;
    };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [
        { provide: UsuariosService, useFactory: mockUsuariosService },
      ],
    }).compile();

    controller = module.get<UsuariosController>(UsuariosController);
    service = module.get(UsuariosService);
  });

  // ── findAll ──────────────────────────────────────────────────────────────
  describe('findAll', () => {
    // [ANTES] it('debe retornar el arreglo de usuarios del service', async () => {
    // [ANTES]   service.findAll.mockResolvedValue([usuarioBase]);
    // [ANTES]   expect(await controller.findAll()).toEqual([usuarioBase]);
    // [ANTES]   expect(service.findAll).toHaveBeenCalledTimes(1);
    // [ANTES] });
    it('debe pasar la paginación y la búsqueda al service', async () => {
      const pagina = {
        data: [usuarioBase],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      service.findAll.mockResolvedValue(pagina);
      const query = { page: 1, limit: 20, buscar: 'juan' };

      expect(await controller.findAll(query)).toEqual(pagina);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('debe retornar el usuario encontrado', async () => {
      service.findOne.mockResolvedValue(usuarioBase);
      // [ANTES] expect(await controller.findOne(1)).toEqual(usuarioBase);
      // [ANTES] expect(await controller.findOne(ID)).toEqual(usuarioBase);
      expect(await controller.findOne(ID, respuesta())).toEqual(usuarioBase);
      // [ANTES] expect(service.findOne).toHaveBeenCalledWith(1);
      expect(service.findOne).toHaveBeenCalledWith(ID);
    });

    it('debe enviar la versión como ETag', async () => {
      service.findOne.mockResolvedValue({ ...usuarioBase, version: 3 });
      const res = respuesta();

      await controller.findOne(ID, res);

      expect(res.setHeader).toHaveBeenCalledWith('ETag', '"3"');
    });

    it('no debe exponer campos de la entidad que el DTO no declara', async () => {
      // Una columna interna que se agregue a la entidad no se publica sola.
      const conColumnaInterna = { ...usuarioBase, notaInterna: 'privada' };
      service.findOne.mockResolvedValue(conColumnaInterna);

      // [ANTES] expect(await controller.findOne(1)).toStrictEqual({
      // [ANTES] expect(await controller.findOne(ID)).toStrictEqual({
      expect(await controller.findOne(ID, respuesta())).toStrictEqual({
        // [ANTES] id: 1,
        id: ID,
        nombre: 'Juan Pérez',
        rut: '12345678-5',
        creadoEn: usuarioBase.creadoEn,
        actualizadoEn: usuarioBase.actualizadoEn,
        version: 1,
      });
    });

    it('debe propagar NotFoundException del service', async () => {
      service.findOne.mockRejectedValue(
        // [ANTES] new NotFoundException('Usuario con id 99 no encontrado'),
        new NotFoundException(`Usuario con id ${ID_INEXISTENTE} no encontrado`),
      );
      // [ANTES] await expect(controller.findOne(99)).rejects.toThrow(NotFoundException);
      // [ANTES] await expect(controller.findOne(ID_INEXISTENTE)).rejects.toThrow(
      await expect(
        controller.findOne(ID_INEXISTENTE, respuesta()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ───────────────────────────────────────────────────────────────
  describe('create', () => {
    it('debe retornar el usuario creado', async () => {
      // [ANTES] const dto = { nombre: 'María López', rut: '98765432-1' };
      const dto = { nombre: 'María López', rut: '98765432-5' };
      // [ANTES] const creado = { id: 2, ...dto };
      const creado = { id: OTRO_ID, ...dto };
      service.create.mockResolvedValue(creado);
      // [ANTES] expect(await controller.create(dto)).toEqual(creado);
      const req = { originalUrl: '/api/v1/usuarios' } as Request;
      // [ANTES] const res = { location: jest.fn() } as unknown as Response;
      const res = respuesta();

      expect(await controller.create(dto, req, res)).toEqual(creado);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('debe indicar en Location dónde quedó el usuario creado', async () => {
      service.create.mockResolvedValue(usuarioBase);
      const req = { originalUrl: '/api/v1/usuarios/?x=1' } as Request;
      const location = jest.fn();

      await controller.create(
        { nombre: usuarioBase.nombre, rut: usuarioBase.rut },
        req,
        // [ANTES] { location } as unknown as Response,
        { location, setHeader: jest.fn() } as unknown as Response,
      );

      // [ANTES] expect(location).toHaveBeenCalledWith('/api/v1/usuarios/1');
      expect(location).toHaveBeenCalledWith(`/api/v1/usuarios/${ID}`);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────
  describe('update', () => {
    it('debe retornar el usuario actualizado', async () => {
      const dto = { nombre: 'Juan Pablo Pérez' };
      const actualizado = { ...usuarioBase, ...dto };
      service.update.mockResolvedValue(actualizado);

      // [ANTES] expect(await controller.update(1, dto)).toEqual(actualizado);
      // [ANTES] expect(await controller.update(ID, dto)).toEqual(actualizado);
      expect(await controller.update(ID, dto, undefined, respuesta())).toEqual(
        actualizado,
      );
      // [ANTES] expect(service.update).toHaveBeenCalledWith(1, dto);
      // [ANTES] expect(service.update).toHaveBeenCalledWith(ID, dto);
      expect(service.update).toHaveBeenCalledWith(ID, dto, undefined);
    });

    it('debe pasar las versiones de If-Match al service y devolver el nuevo ETag', async () => {
      service.update.mockResolvedValue({ ...usuarioBase, version: 4 });
      const res = respuesta();

      await controller.update(ID, { nombre: 'Otro' }, '"3"', res);

      expect(service.update).toHaveBeenCalledWith(ID, { nombre: 'Otro' }, [3]);
      expect(res.setHeader).toHaveBeenCalledWith('ETag', '"4"');
    });

    it('debe propagar NotFoundException del service', async () => {
      service.update.mockRejectedValue(
        // [ANTES] new NotFoundException('Usuario con id 99 no encontrado'),
        new NotFoundException(`Usuario con id ${ID_INEXISTENTE} no encontrado`),
      );
      // [ANTES] await expect(controller.update(99, { nombre: 'X' })).rejects.toThrow(
      await expect(
        // [ANTES] controller.update(ID_INEXISTENTE, { nombre: 'X' }),
        controller.update(
          ID_INEXISTENTE,
          { nombre: 'X' },
          undefined,
          respuesta(),
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('debe llamar al service con el id correcto', async () => {
      service.remove.mockResolvedValue(undefined);
      // [ANTES] await expect(controller.remove(1)).resolves.toBeUndefined();
      await expect(controller.remove(ID)).resolves.toBeUndefined();
      // [ANTES] expect(service.remove).toHaveBeenCalledWith(1);
      expect(service.remove).toHaveBeenCalledWith(ID);
    });

    it('debe propagar NotFoundException del service', async () => {
      service.remove.mockRejectedValue(
        // [ANTES] new NotFoundException('Usuario con id 99 no encontrado'),
        new NotFoundException(`Usuario con id ${ID_INEXISTENTE} no encontrado`),
      );
      // [ANTES] await expect(controller.remove(99)).rejects.toThrow(NotFoundException);
      await expect(controller.remove(ID_INEXISTENTE)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
