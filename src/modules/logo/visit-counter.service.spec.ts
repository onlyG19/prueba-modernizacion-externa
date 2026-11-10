import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.provider';
import {
  VISIT_COUNTER_KEY,
  VisitCounterService,
} from './visit-counter.service';

const mockRedis = () => ({
  incr: jest.fn(),
  get: jest.fn(),
});

describe('VisitCounterService', () => {
  let service: VisitCounterService;
  let redis: ReturnType<typeof mockRedis>;
  let warn: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitCounterService,
        { provide: REDIS_CLIENT, useFactory: mockRedis },
      ],
    }).compile();

    service = module.get(VisitCounterService);
    redis = module.get(REDIS_CLIENT);
    // Silencia y captura los warnings del Logger de Nest
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('debe mantener la misma clave de Redis para no perder el conteo histórico', () => {
    expect(VISIT_COUNTER_KEY).toBe('logo:request:count');
  });

  // ── increment ────────────────────────────────────────────────────────────
  describe('increment', () => {
    it('debe llamar a redis.incr y retornar el valor incrementado', async () => {
      redis.incr.mockResolvedValue(5);

      expect(await service.increment()).toBe(5);
      expect(redis.incr).toHaveBeenCalledWith(VISIT_COUNTER_KEY);
    });

    it('debe retornar null y registrar un warning si Redis falla, sin lanzar', async () => {
      redis.incr.mockRejectedValue(new Error('Connection is closed.'));

      await expect(service.increment()).resolves.toBeNull();
      expect(warn).toHaveBeenCalledWith(
        'No se pudo registrar la visita: Connection is closed.',
      );
    });
  });

  // ── getCount ─────────────────────────────────────────────────────────────
  describe('getCount', () => {
    it('debe retornar el valor parseado cuando existe', async () => {
      redis.get.mockResolvedValue('42');

      expect(await service.getCount()).toBe(42);
      expect(redis.get).toHaveBeenCalledWith(VISIT_COUNTER_KEY);
    });

    it('debe retornar 0 cuando la clave no existe en Redis', async () => {
      redis.get.mockResolvedValue(null);

      expect(await service.getCount()).toBe(0);
    });

    it('debe lanzar ServiceUnavailableException (503) si Redis falla', async () => {
      redis.get.mockRejectedValue(new Error('Connection is closed.'));

      await expect(service.getCount()).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(warn).toHaveBeenCalledWith(
        'No se pudo leer el contador: Connection is closed.',
      );
    });
  });
});
