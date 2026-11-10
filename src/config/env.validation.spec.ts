import 'reflect-metadata';
import { Environment, validateEnv } from './env.validation';

const minimas = {
  DB_NAME: 'prueba',
  DB_USER: 'postgres',
  DB_PASSWORD: 'secreto',
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

  it.each(['DB_NAME', 'DB_USER', 'DB_PASSWORD'])(
    'debe fallar si falta la variable obligatoria %s',
    (variable) => {
      const config: Record<string, unknown> = { ...minimas };
      delete config[variable];

      expect(() => validateEnv(config)).toThrow(variable);
    },
  );

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

  it('debe listar todos los errores juntos, no solo el primero', () => {
    expect(() => validateEnv({})).toThrow(
      /DB_NAME[\s\S]*DB_USER[\s\S]*DB_PASSWORD/,
    );
  });
});
