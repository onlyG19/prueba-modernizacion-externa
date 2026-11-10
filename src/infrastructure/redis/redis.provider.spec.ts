import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { logConnectionChanges } from './redis.provider';

describe('logConnectionChanges', () => {
  let client: EventEmitter;
  let warn: jest.Mock;
  let log: jest.Mock;

  beforeEach(() => {
    client = new EventEmitter();
    warn = jest.fn();
    log = jest.fn();
    logConnectionChanges(client as unknown as Redis, { warn, log });
  });

  const errorDeConexion = () =>
    Object.assign(new Error(''), { code: 'ECONNREFUSED' });

  it('debe registrar la caída una sola vez aunque ioredis reintente muchas veces', () => {
    client.emit('error', errorDeConexion());
    client.emit('error', errorDeConexion());
    client.emit('error', errorDeConexion());

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      'Conexión con Redis perdida: ECONNREFUSED',
    );
  });

  it('debe registrar la recuperación cuando la conexión vuelve', () => {
    client.emit('error', errorDeConexion());
    client.emit('ready');

    expect(log).toHaveBeenCalledWith('Conexión con Redis restablecida');
  });

  it('no debe registrar nada en la primera conexión exitosa', () => {
    client.emit('ready');

    expect(warn).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it('debe volver a avisar si la conexión se cae de nuevo tras recuperarse', () => {
    client.emit('error', errorDeConexion());
    client.emit('ready');
    client.emit('error', errorDeConexion());

    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('debe evitar el "Unhandled error event" de ioredis escuchando el evento error', () => {
    expect(client.listenerCount('error')).toBe(1);
  });
});
