import { Test, TestingModule } from '@nestjs/testing';
import { LogoController } from './logo.controller';
import { LogoService } from './logo.service';

const mockLogoService = () => ({
  incrementCounter: jest.fn(),
  getLogoStream: jest.fn(),
  getCounter: jest.fn(),
});

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
    it('debe setear headers y pipear el stream al response', async () => {
      const fakeStream = { pipe: jest.fn() };
      service.incrementCounter.mockResolvedValue(3);
      service.getLogoStream.mockReturnValue({
        stream: fakeStream,
        contentType: 'image/png',
      });

      const mockRes = {
        setHeader: jest.fn(),
      } as any;

      await controller.getLogo(mockRes);

      expect(service.incrementCounter).toHaveBeenCalledTimes(1);
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'image/png',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-Count', '3');
      expect(fakeStream.pipe).toHaveBeenCalledWith(mockRes);
    });

    it('debe usar el contentType retornado por el service', async () => {
      const fakeStream = { pipe: jest.fn() };
      service.incrementCounter.mockResolvedValue(1);
      service.getLogoStream.mockReturnValue({
        stream: fakeStream,
        contentType: 'image/svg+xml',
      });

      const mockRes = { setHeader: jest.fn() } as any;
      await controller.getLogo(mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'image/svg+xml',
      );
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
