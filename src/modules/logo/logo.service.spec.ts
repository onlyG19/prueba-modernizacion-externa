import { Test, TestingModule } from '@nestjs/testing';
import { join } from 'path';
import { LOGO_ASSETS_DIR, LogoService } from './logo.service';

// Mock de fs para controlar qué archivos de logo "existen" y qué contienen
jest.mock('fs', () => ({
  ...jest.requireActual<typeof import('fs')>('fs'),
  existsSync: jest.fn(),
}));
jest.mock('fs/promises', () => ({ readFile: jest.fn() }));

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

describe('LogoService', () => {
  let service: LogoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogoService],
    }).compile();

    service = module.get<LogoService>(LogoService);
    jest.clearAllMocks();
  });

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
