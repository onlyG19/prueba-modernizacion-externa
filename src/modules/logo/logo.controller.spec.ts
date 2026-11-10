import { StreamableFile } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { LogoController } from './logo.controller';
import { LogoService } from './logo.service';

const mockLogoService = () => ({
  incrementCounter: jest.fn(),
  // [ANTES] getLogoStream: jest.fn(),
  getLogo: jest.fn(),
  getCounter: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogoController],
      providers: [{ provide: LogoService, useFactory: mockLogoService }],
    }).compile();

    controller = module.get<LogoController>(LogoController);
    service = module.get(LogoService);
    jest.clearAllMocks();
  });

  // ── getLogo ───────────────────────────────────────────────────────────────
  describe('getLogo', () => {
    // [ANTES] it('debe setear headers y pipear el stream al response', async () => {
    // [ANTES]   const fakeStream = { pipe: jest.fn() };
    // [ANTES]   service.incrementCounter.mockResolvedValue(3);
    // [ANTES]   service.getLogoStream.mockReturnValue({
    // [ANTES]     stream: fakeStream,
    // [ANTES]     contentType: 'image/png',
    // [ANTES]   });
    // [ANTES]
    // [ANTES]   const mockRes = {
    // [ANTES]     setHeader: jest.fn(),
    // [ANTES]   } as any;
    // [ANTES]
    // [ANTES]   await controller.getLogo(mockRes);
    // [ANTES]
    // [ANTES]   expect(service.incrementCounter).toHaveBeenCalledTimes(1);
    // [ANTES]   expect(mockRes.setHeader).toHaveBeenCalledWith(
    // [ANTES]     'Content-Type',
    // [ANTES]     'image/png',
    // [ANTES]   );
    // [ANTES]   expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-Count', '3');
    // [ANTES]   expect(fakeStream.pipe).toHaveBeenCalledWith(mockRes);
    // [ANTES] });
    // [ANTES]
    // [ANTES] it('debe usar el contentType retornado por el service', async () => {
    // [ANTES]   const fakeStream = { pipe: jest.fn() };
    // [ANTES]   service.incrementCounter.mockResolvedValue(1);
    // [ANTES]   service.getLogoStream.mockReturnValue({
    // [ANTES]     stream: fakeStream,
    // [ANTES]     contentType: 'image/svg+xml',
    // [ANTES]   });
    // [ANTES]
    // [ANTES]   const mockRes = { setHeader: jest.fn() } as any;
    // [ANTES]   await controller.getLogo(mockRes);
    // [ANTES]
    // [ANTES]   expect(mockRes.setHeader).toHaveBeenCalledWith(
    // [ANTES]     'Content-Type',
    // [ANTES]     'image/svg+xml',
    // [ANTES]   );
    // [ANTES] });

    it('debe devolver el logo como StreamableFile con su tipo y largo', async () => {
      service.incrementCounter.mockResolvedValue(3);
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
      service.incrementCounter.mockResolvedValue(3);
      service.getLogo.mockReturnValue(logoSvg);
      const { res, setHeader } = crearRespuesta();

      await controller.getLogo(res);

      expect(service.incrementCounter).toHaveBeenCalledTimes(1);
      expect(setHeader).toHaveBeenCalledWith('X-Request-Count', '3');
    });
  });

  // ── getCount ──────────────────────────────────────────────────────────────
  describe('getCount', () => {
    it('debe retornar el contador envuelto en un objeto', async () => {
      service.getCounter.mockResolvedValue(42);
      const result = await controller.getCount();
      expect(result).toEqual({ count: 42 });
      expect(service.getCounter).toHaveBeenCalledTimes(1);
    });

    it('debe retornar { count: 0 } cuando el contador es 0', async () => {
      service.getCounter.mockResolvedValue(0);
      expect(await controller.getCount()).toEqual({ count: 0 });
    });
  });
});
