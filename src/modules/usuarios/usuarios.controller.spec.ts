import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
// [ANTES] import { Usuario } from './usuario.entity';
import type { Request, Response } from 'express';
import { Usuario } from './entities/usuario.entity';

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
    id: 1,
    nombre: 'Juan Pérez',
    // [ANTES] rut: '12345678-9', van a fallar los test si dejamos ese DV mal
    rut: '12345678-5',
    creadoEn: new Date('2026-11-10T14:03:00.000Z'),
    actualizadoEn: new Date('2026-11-10T14:03:00.000Z'),
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
      expect(await controller.findOne(1)).toEqual(usuarioBase);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('no debe exponer campos de la entidad que el DTO no declara', async () => {
      // Una columna interna que se agregue a la entidad no se publica sola.
      const conColumnaInterna = { ...usuarioBase, notaInterna: 'privada' };
      service.findOne.mockResolvedValue(conColumnaInterna);

      expect(await controller.findOne(1)).toStrictEqual({
        id: 1,
        nombre: 'Juan Pérez',
        rut: '12345678-5',
        creadoEn: usuarioBase.creadoEn,
        actualizadoEn: usuarioBase.actualizadoEn,
      });
    });

    it('debe propagar NotFoundException del service', async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException('Usuario con id 99 no encontrado'),
      );
      await expect(controller.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ───────────────────────────────────────────────────────────────
  describe('create', () => {
    it('debe retornar el usuario creado', async () => {
      // [ANTES] const dto = { nombre: 'María López', rut: '98765432-1' };
      const dto = { nombre: 'María López', rut: '98765432-5' };
      const creado = { id: 2, ...dto };
      service.create.mockResolvedValue(creado);
      // [ANTES] expect(await controller.create(dto)).toEqual(creado);
      const req = { originalUrl: '/api/v1/usuarios' } as Request;
      const res = { location: jest.fn() } as unknown as Response;

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
        { location } as unknown as Response,
      );

      expect(location).toHaveBeenCalledWith('/api/v1/usuarios/1');
    });
  });

  // ── update ───────────────────────────────────────────────────────────────
  describe('update', () => {
    it('debe retornar el usuario actualizado', async () => {
      const dto = { nombre: 'Juan Pablo Pérez' };
      const actualizado = { ...usuarioBase, ...dto };
      service.update.mockResolvedValue(actualizado);

      expect(await controller.update(1, dto)).toEqual(actualizado);
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });

    it('debe propagar NotFoundException del service', async () => {
      service.update.mockRejectedValue(
        new NotFoundException('Usuario con id 99 no encontrado'),
      );
      await expect(controller.update(99, { nombre: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('debe llamar al service con el id correcto', async () => {
      service.remove.mockResolvedValue(undefined);
      await expect(controller.remove(1)).resolves.toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('debe propagar NotFoundException del service', async () => {
      service.remove.mockRejectedValue(
        new NotFoundException('Usuario con id 99 no encontrado'),
      );
      await expect(controller.remove(99)).rejects.toThrow(NotFoundException);
    });
  });
});
