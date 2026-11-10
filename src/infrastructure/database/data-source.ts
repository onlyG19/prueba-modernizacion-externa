import 'reflect-metadata';
import { existsSync } from 'fs';
import { DataSource } from 'typeorm';
import { validateEnv } from '../../config/env.validation';
import { buildDataSourceOptions } from './database.options';

// El CLI de TypeORM corre fuera de Nest: carga el .env y lo valida igual que la app.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default new DataSource(buildDataSourceOptions(validateEnv(process.env)));
