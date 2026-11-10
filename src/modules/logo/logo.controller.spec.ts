import { StreamableFile } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { LogoController } from './logo.controller';
import { LogoService } from './logo.service';
import { VisitCounterService } from './visit-counter.service';

const mockLogoService = () => ({
  getLogo: jest.fn(),
});

const mockVisitCounter = () => ({
  increment: jest.fn(),
  getCount: jest.fn(),
});

const logoSvg = {
  content: Buffer.from('<svg/>'),
  contentType: 'image/svg+xml',
};

/** Respuesta HTTP mínima: el controller solo usa `setHeader`. */
const crearRespuesta = () => {
  const setHeader = jest.fn();
  return { res: { setHeader } as unknown as Response, setHeader };
};

describe('LogoController', () => {
  let controller: LogoController;
  let service: ReturnType<typeof mockLogoService>;
  let visitCounter: ReturnType<typeof mockVisitCounter>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogoController],
      providers: [
        { provide: LogoService, useFactory: mockLogoService },
        { provide: VisitCounterService, useFactory: mockVisitCounter },
      ],
    }).compile();

    controller = module.get<LogoController>(LogoController);
    service = module.get(LogoService);
    visitCounter = module.get(VisitCounterService);
    jest.clearAllMocks();
  });

  // ── getLogo ───────────────────────────────────────────────────────────────
  describe('getLogo', () => {
    it('debe devolver el logo como StreamableFile con su tipo y largo', async () => {
      visitCounter.increment.mockResolvedValue(3);
      service.getLogo.mockReturnValue(logoSvg);
      const { res } = crearRespuesta();

      const archivo = await controller.getLogo(res);

      expect(archivo).toBeInstanceOf(StreamableFile);
      expect(archivo.getHeaders()).toMatchObject({
        type: 'image/svg+xml',
        length: logoSvg.content.length,
      });
    });

    it('debe incrementar el contador y enviarlo en X-Request-Count', async () => {
      visitCounter.increment.mockResolvedValue(3);
      service.getLogo.mockReturnValue(logoSvg);
      const { res, setHeader } = crearRespuesta();

      await controller.getLogo(res);

      expect(visitCounter.increment).toHaveBeenCalledTimes(1);
      expect(setHeader).toHaveBeenCalledWith('X-Request-Count', '3');
    });

    it('debe servir el logo sin X-Request-Count si el contador no está disponible', async () => {
      visitCounter.increment.mockResolvedValue(null);
      service.getLogo.mockReturnValue(logoSvg);
      const { res, setHeader } = crearRespuesta();

      const archivo = await controller.getLogo(res);

      expect(archivo).toBeInstanceOf(StreamableFile);
      expect(setHeader).not.toHaveBeenCalled();
    });
  });

  // ── getCount ──────────────────────────────────────────────────────────────
  describe('getCount', () => {
    it('debe retornar el contador envuelto en un objeto', async () => {
      visitCounter.getCount.mockResolvedValue(42);
      const result = await controller.getCount();
      expect(result).toEqual({ count: 42 });
      expect(visitCounter.getCount).toHaveBeenCalledTimes(1);
    });

    it('debe retornar { count: 0 } cuando el contador es 0', async () => {
      visitCounter.getCount.mockResolvedValue(0);
      expect(await controller.getCount()).toEqual({ count: 0 });
    });
  });
});
