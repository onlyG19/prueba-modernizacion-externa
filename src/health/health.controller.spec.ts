import type { Response } from 'express';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { HealthController, PROBE_TIMEOUT_MS } from './health.controller';

describe('HealthController', () => {
  const crear = (query: jest.Mock, ping: jest.Mock) =>
    new HealthController(
      { query } as unknown as DataSource,
      { ping } as unknown as Redis,
    );
  const respuesta = () => {
    const status = jest.fn();
    return { res: { status } as unknown as Response, status };
  };

  afterEach(() => jest.useRealTimers());

  it('debe responder ok si la base de datos y Redis responden', async () => {
    const controller = crear(
      jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      jest.fn().mockResolvedValue('PONG'),
    );
    const { res, status } = respuesta();

    await expect(controller.check(res)).resolves.toEqual({
      status: 'ok',
      database: 'up',
      redis: 'up',
    });
    expect(status).not.toHaveBeenCalled();
  });

  it('debe responder degraded (200) si solo falla Redis', async () => {
    const controller = crear(
      jest.fn().mockResolvedValue([]),
      jest.fn().mockRejectedValue(new Error('Connection is closed.')),
    );
    const { res, status } = respuesta();

    await expect(controller.check(res)).resolves.toEqual({
      status: 'degraded',
      database: 'up',
      redis: 'down',
    });
    expect(status).not.toHaveBeenCalled();
  });

  it('debe responder 503 con el mismo formato si falla la base de datos', async () => {
    const controller = crear(
      jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      jest.fn().mockResolvedValue('PONG'),
    );
    const { res, status } = respuesta();

    await expect(controller.check(res)).resolves.toEqual({
      status: 'error',
      database: 'down',
      redis: 'up',
    });
    expect(status).toHaveBeenCalledWith(503);
  });

  it('debe dar por caída una dependencia que no responde a tiempo', async () => {
    jest.useFakeTimers();
    const controller = crear(
      jest.fn().mockResolvedValue([]),
      jest.fn().mockReturnValue(new Promise(() => undefined)),
    );

    const resultado = controller.check(respuesta().res);
    await jest.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS);

    await expect(resultado).resolves.toMatchObject({ redis: 'down' });
  });
});
