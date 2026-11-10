import { Test, TestingModule } from '@nestjs/testing';
import { LogoService } from './logo.service';
// [ANTES] import { REDIS_CLIENT } from '../redis/redis.provider';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.provider';

// Mock del módulo fs para controlar existsSync y createReadStream
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  createReadStream: jest.fn(),
}));

import { existsSync, createReadStream } from 'fs';

const mockRedis = () => ({
  incr: jest.fn(),
  get: jest.fn(),
});

describe('LogoService', () => {
  let service: LogoService;
  let redis: ReturnType<typeof mockRedis>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoService,
        { provide: REDIS_CLIENT, useFactory: mockRedis },
      ],
    }).compile();

    service = module.get<LogoService>(LogoService);
    redis = module.get(REDIS_CLIENT);
    jest.clearAllMocks();
  });

  // ── incrementCounter ─────────────────────────────────────────────────────
  describe('incrementCounter', () => {
    it('debe llamar a redis.incr y retornar el valor incrementado', async () => {
      redis.incr.mockResolvedValue(5);
      const result = await service.incrementCounter();
      expect(redis.incr).toHaveBeenCalledWith('logo:request:count');
      expect(result).toBe(5);
    });
  });

  // ── getCounter ───────────────────────────────────────────────────────────
  describe('getCounter', () => {
    it('debe retornar el valor parseado cuando existe', async () => {
      redis.get.mockResolvedValue('42');
      expect(await service.getCounter()).toBe(42);
      expect(redis.get).toHaveBeenCalledWith('logo:request:count');
    });

    it('debe retornar 0 cuando la clave no existe en Redis', async () => {
      redis.get.mockResolvedValue(null);
      expect(await service.getCounter()).toBe(0);
    });
  });

  // ── getLogoStream ────────────────────────────────────────────────────────
  describe('getLogoStream', () => {
    const fakeStream = { pipe: jest.fn() } as any;

    it('debe retornar PNG si logo.png existe', () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (createReadStream as jest.Mock).mockReturnValue(fakeStream);

      const result = service.getLogoStream();

      expect(result.contentType).toBe('image/png');
      expect(result.stream).toBe(fakeStream);
    });

    it('debe retornar SVG si logo.png no existe', () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      (createReadStream as jest.Mock).mockReturnValue(fakeStream);

      const result = service.getLogoStream();

      expect(result.contentType).toBe('image/svg+xml');
      expect(result.stream).toBe(fakeStream);
    });
  });
});
