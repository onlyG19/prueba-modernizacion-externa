import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from './env.validation';

/**
 * `ConfigService` tipado con las variables de entorno ya validadas.
 *
 * @remarks
 * - El primer genérico hace que los nombres de variables se autocompleten y
 *   que un nombre inexistente sea un error de compilación.
 * - El segundo (`true`) indica que la configuración fue validada al arrancar,
 *   por lo que `get()` nunca devuelve `undefined`.
 * - Con `{ infer: true }` el tipo se deduce del esquema, pero TypeScript puede
 *   ajustarlo al contexto donde se asigna: no reemplaza el revisar que la
 *   variable usada sea la correcta.
 */
export type AppConfigService = ConfigService<EnvironmentVariables, true>;
