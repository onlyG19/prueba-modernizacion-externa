import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueryFailedError, Repository } from 'typeorm';
import { verifyPassword } from '../../common/security/password';
import { EnvironmentVariables } from '../../config/env.validation';
import { PG_UNIQUE_VIOLATION } from '../../infrastructure/database/postgres-errors';
import { CuentasService } from './cuentas.service';
import { Cuenta } from './entities/cuenta.entity';

/** Lo que lanza TypeORM cuando Postgres rechaza un usuario duplicado. */
const violacionUnique = new QueryFailedError(
  'INSERT INTO "cuentas" ...',
  [],
  Object.assign(new Error('duplicate key value'), {
    code: PG_UNIQUE_VIOLATION,
  }),
);

describe('CuentasService', () => {
  let repositorio: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
  };
  let service: CuentasService;

  beforeEach(() => {
    repositorio = {
      create: jest.fn((datos: Partial<Cuenta>) => ({ ...datos })),
      save: jest.fn((cuenta: Cuenta) =>
        Promise.resolve({ ...cuenta, id: 'c1', creadoEn: new Date() }),
      ),
      findOneBy: jest.fn().mockResolvedValue(null),
    };
    const config = {
      get: () => 'Admin',
    } as unknown as ConfigService<EnvironmentVariables, true>;
    service = new CuentasService(
      repositorio as unknown as Repository<Cuenta>,
      config,
    );
  });

  describe('create', () => {
    it('debe guardar el hash de la contraseña, nunca la contraseña', async () => {
      const creada = await service.create({
        username: 'maria.lopez',
        password: 'una frase larga y secreta',
      });

      expect(creada.username).toBe('maria.lopez');
      expect(creada.passwordHash).not.toContain('una frase');
      await expect(
        verifyPassword('una frase larga y secreta', creada.passwordHash),
      ).resolves.toBe(true);
    });

    it('debe responder 409 si el usuario ya existe', async () => {
      repositorio.save.mockRejectedValue(violacionUnique);

      await expect(
        service.create({ username: 'maria.lopez', password: 'x'.repeat(12) }),
      ).rejects.toThrow(
        new ConflictException('El usuario maria.lopez ya está en uso'),
      );
    });

    it('debe responder 409 si el usuario es el del administrador, sin importar mayúsculas', async () => {
      await expect(
        service.create({ username: 'admin', password: 'x'.repeat(12) }),
      ).rejects.toThrow(ConflictException);
      expect(repositorio.save).not.toHaveBeenCalled();
    });

    it('debe dejar pasar cualquier otro error de la base de datos', async () => {
      const caida = new Error('conexión perdida');
      repositorio.save.mockRejectedValue(caida);

      await expect(
        service.create({ username: 'maria.lopez', password: 'x'.repeat(12) }),
      ).rejects.toBe(caida);
    });
  });

  describe('buscarPorUsername', () => {
    it('debe buscar el usuario normalizado (sin espacios y en minúsculas)', async () => {
      await service.buscarPorUsername('  Maria.Lopez ');

      expect(repositorio.findOneBy).toHaveBeenCalledWith({
        username: 'maria.lopez',
      });
    });
  });
});
