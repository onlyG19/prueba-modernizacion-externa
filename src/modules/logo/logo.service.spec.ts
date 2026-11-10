import { Test, TestingModule } from '@nestjs/testing';
import { join } from 'path';
// [ANTES] import { LogoService } from './logo.service';
import { LOGO_ASSETS_DIR, LogoService } from './logo.service';
// [ANTES] import { REDIS_CLIENT } from '../redis/redis.provider';
// [ANTES] import { REDIS_CLIENT } from '../../infrastructure/redis/redis.provider';

// [ANTES] // Mock del módulo fs para controlar existsSync y createReadStream
// [ANTES] jest.mock('fs', () => ({
// [ANTES]   ...jest.requireActual('fs'),
// [ANTES]   existsSync: jest.fn(),
// [ANTES]   createReadStream: jest.fn(),
// [ANTES] }));
// Mock de fs para controlar qué archivos de logo "existen" y qué contienen
jest.mock('fs', () => ({
  ...jest.requireActual<typeof import('fs')>('fs'),
  existsSync: jest.fn(),
}));
jest.mock('fs/promises', () => ({ readFile: jest.fn() }));

// [ANTES] import { existsSync, createReadStream } from 'fs';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

// [ANTES] const mockRedis = () => ({
// [ANTES]   incr: jest.fn(),
// [ANTES]   get: jest.fn(),
// [ANTES] });

describe('LogoService', () => {
  let service: LogoService;
  // [ANTES] let redis: ReturnType<typeof mockRedis>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      // [ANTES] providers: [
      // [ANTES]   LogoService,
      // [ANTES]   { provide: REDIS_CLIENT, useFactory: mockRedis },
      // [ANTES] ],
      providers: [LogoService],
    }).compile();

    service = module.get<LogoService>(LogoService);
    // [ANTES] redis = module.get(REDIS_CLIENT);
    jest.clearAllMocks();
  });

  // (los tests del contador se movieron a visit-counter.service.spec.ts)
  // [ANTES] // ── incrementCounter ─────────────────────────────────────────────────────
  // [ANTES] describe('incrementCounter', () => {
  // [ANTES]   it('debe llamar a redis.incr y retornar el valor incrementado', async () => {
  // [ANTES]     redis.incr.mockResolvedValue(5);
  // [ANTES]     const result = await service.incrementCounter();
  // [ANTES]     expect(redis.incr).toHaveBeenCalledWith('logo:request:count');
  // [ANTES]     expect(result).toBe(5);
  // [ANTES]   });
  // [ANTES] });
  // [ANTES]
  // [ANTES] // ── getCounter ───────────────────────────────────────────────────────────
  // [ANTES] describe('getCounter', () => {
  // [ANTES]   it('debe retornar el valor parseado cuando existe', async () => {
  // [ANTES]     redis.get.mockResolvedValue('42');
  // [ANTES]     expect(await service.getCounter()).toBe(42);
  // [ANTES]     expect(redis.get).toHaveBeenCalledWith('logo:request:count');
  // [ANTES]   });
  // [ANTES]
  // [ANTES]   it('debe retornar 0 cuando la clave no existe en Redis', async () => {
  // [ANTES]     redis.get.mockResolvedValue(null);
  // [ANTES]     expect(await service.getCounter()).toBe(0);
  // [ANTES]   });
  // [ANTES] });

  // [ANTES] // ── getLogoStream ────────────────────────────────────────────────────────
  // [ANTES] describe('getLogoStream', () => {
  // [ANTES]   const fakeStream = { pipe: jest.fn() } as any;
  // [ANTES]
  // [ANTES]   it('debe retornar PNG si logo.png existe', () => {
  // [ANTES]     (existsSync as jest.Mock).mockReturnValue(true);
  // [ANTES]     (createReadStream as jest.Mock).mockReturnValue(fakeStream);
  // [ANTES]
  // [ANTES]     const result = service.getLogoStream();
  // [ANTES]
  // [ANTES]     expect(result.contentType).toBe('image/png');
  // [ANTES]     expect(result.stream).toBe(fakeStream);
  // [ANTES]   });
  // [ANTES]
  // [ANTES]   it('debe retornar SVG si logo.png no existe', () => {
  // [ANTES]     (existsSync as jest.Mock).mockReturnValue(false);
  // [ANTES]     (createReadStream as jest.Mock).mockReturnValue(fakeStream);
  // [ANTES]
  // [ANTES]     const result = service.getLogoStream();
  // [ANTES]
  // [ANTES]     expect(result.contentType).toBe('image/svg+xml');
  // [ANTES]     expect(result.stream).toBe(fakeStream);
  // [ANTES]   });
  // [ANTES] });

  // ── onModuleInit / getLogo ───────────────────────────────────────────────
  describe('onModuleInit / getLogo', () => {
    /** Simula que solo existen los archivos indicados en la carpeta del logo. */
    const existen = (...archivos: string[]) =>
      (existsSync as jest.Mock).mockImplementation((ruta: string) =>
        archivos.some((archivo) => ruta === join(LOGO_ASSETS_DIR, archivo)),
      );

    it('debe preferir logo.png si existe', async () => {
      existen('logo.png', 'logo.svg');
      (readFile as jest.Mock).mockResolvedValue(Buffer.from('png'));

      await service.onModuleInit();

      expect(readFile).toHaveBeenCalledWith(join(LOGO_ASSETS_DIR, 'logo.png'));
      expect(service.getLogo()).toEqual({
        content: Buffer.from('png'),
        contentType: 'image/png',
      });
    });

    it('debe usar logo.svg si no existe logo.png', async () => {
      existen('logo.svg');
      (readFile as jest.Mock).mockResolvedValue(Buffer.from('<svg/>'));

      await service.onModuleInit();

      expect(service.getLogo()).toEqual({
        content: Buffer.from('<svg/>'),
        contentType: 'image/svg+xml',
      });
    });

    it('debe leer el archivo una sola vez, al iniciar', async () => {
      existen('logo.svg');
      (readFile as jest.Mock).mockResolvedValue(Buffer.from('<svg/>'));

      await service.onModuleInit();
      service.getLogo();
      service.getLogo();

      expect(readFile).toHaveBeenCalledTimes(1);
    });

    it('debe impedir que el módulo arranque si no existe ningún logo', async () => {
      existen();

      await expect(service.onModuleInit()).rejects.toThrow(
        'No se encontró el logo',
      );
    });

    it('debe resolver la carpeta respecto del módulo, no del directorio de trabajo', () => {
      expect(LOGO_ASSETS_DIR).toBe(join(__dirname, 'assets'));
    });

    it('el logo real del repositorio debe existir en esa carpeta', () => {
      const fsReal = jest.requireActual<typeof import('fs')>('fs');
      expect(fsReal.existsSync(join(LOGO_ASSETS_DIR, 'logo.svg'))).toBe(true);
    });
  });
});
