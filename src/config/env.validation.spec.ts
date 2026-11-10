import 'reflect-metadata';
import { Environment, validateEnv } from './env.validation';

const minimas = {
  DB_NAME: 'prueba',
  DB_USER: 'postgres',
  DB_PASSWORD: 'secreto',
  JWT_SECRET: 'x'.repeat(32),
  AUTH_USER: 'admin',
  AUTH_PASSWORD_HASH: `${'a'.repeat(32)}:${'b'.repeat(128)}`,
};

describe('validateEnv', () => {
  it('debe aplicar los valores por defecto a las variables opcionales', () => {
    const env = validateEnv(minimas);

    expect(env.NODE_ENV).toBe(Environment.Development);
    expect(env.PORT).toBe(3000);
    expect(env.DB_HOST).toBe('localhost');
    expect(env.DB_PORT).toBe(5432);
    expect(env.REDIS_PORT).toBe(6379);
  });

  it('debe convertir a número los puertos que llegan como texto', () => {
    const env = validateEnv({ ...minimas, PORT: '8080', DB_PORT: '5433' });

    expect(env.PORT).toBe(8080);
    expect(env.DB_PORT).toBe(5433);
  });

  // [ANTES] it.each(['DB_NAME', 'DB_USER', 'DB_PASSWORD'])(
  it.each([
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
    'AUTH_USER',
    'AUTH_PASSWORD_HASH',
  ])('debe fallar si falta la variable obligatoria %s', (variable) => {
    const config: Record<string, unknown> = { ...minimas };
    delete config[variable];

    expect(() => validateEnv(config)).toThrow(variable);
  });

  it.each([
    ['PORT', 'abc'],
    ['DB_PORT', '70000'],
    ['NODE_ENV', 'staging'],
    ['DB_PASSWORD', ''],
  ])('debe fallar si %s tiene el valor inválido "%s"', (variable, valor) => {
    expect(() => validateEnv({ ...minimas, [variable]: valor })).toThrow(
      variable,
    );
  });

  it('debe aceptar REDIS_PASSWORD como opcional', () => {
    expect(validateEnv(minimas).REDIS_PASSWORD).toBeUndefined();
    expect(
      validateEnv({ ...minimas, REDIS_PASSWORD: 'clave' }).REDIS_PASSWORD,
    ).toBe('clave');
  });

  it('debe rechazar un JWT_SECRET de menos de 32 caracteres', () => {
    expect(() => validateEnv({ ...minimas, JWT_SECRET: 'corto' })).toThrow(
      'JWT_SECRET debe tener al menos 32 caracteres',
    );
  });

  it('debe explicar cómo generar AUTH_PASSWORD_HASH si no tiene el formato', () => {
    expect(() =>
      validateEnv({
        ...minimas,
        AUTH_PASSWORD_HASH: 'contraseña-en-texto-plano',
      }),
    ).toThrow('pnpm auth:hash-password');
  });

  it('debe rechazar CORS_ORIGIN="*" en producción', () => {
    expect(() =>
      validateEnv({ ...minimas, NODE_ENV: 'production', CORS_ORIGIN: '*' }),
    ).toThrow('CORS_ORIGIN no puede ser "*" en producción');
  });

  it('debe aceptar una lista de orígenes en producción', () => {
    const env = validateEnv({
      ...minimas,
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://app.ejemplo.cl',
    });

    expect(env.CORS_ORIGIN).toBe('https://app.ejemplo.cl');
  });

  it('debe rechazar un origen de CORS con barra final', () => {
    expect(() =>
      validateEnv({ ...minimas, CORS_ORIGIN: 'http://localhost:5173/' }),
    ).toThrow('origen inválido: "http://localhost:5173/"');
  });

  it('debe listar todos los errores juntos, no solo el primero', () => {
    expect(() => validateEnv({})).toThrow(
      /DB_NAME[\s\S]*DB_USER[\s\S]*DB_PASSWORD/,
    );
  });
});
