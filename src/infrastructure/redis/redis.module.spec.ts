import Redis from 'ioredis';
import { RedisModule } from './redis.module';

describe('RedisModule', () => {
  const crearModulo = (quit: jest.Mock) => {
    const disconnect = jest.fn();
    const modulo = new RedisModule({ quit, disconnect } as unknown as Redis);
    return { modulo, disconnect };
  };

  it('debe cerrar la conexión con quit() al apagar la app', async () => {
    const quit = jest.fn().mockResolvedValue('OK');
    const { modulo, disconnect } = crearModulo(quit);

    await modulo.onApplicationShutdown();

    expect(quit).toHaveBeenCalledTimes(1);
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('debe cortar la conexión con disconnect() si quit() falla', async () => {
    const quit = jest
      .fn()
      .mockRejectedValue(new Error('Connection is closed.'));
    const { modulo, disconnect } = crearModulo(quit);

    await expect(modulo.onApplicationShutdown()).resolves.toBeUndefined();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
