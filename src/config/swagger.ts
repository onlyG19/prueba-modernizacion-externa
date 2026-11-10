import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

/** Ruta de la documentación interactiva; el JSON queda en `/docs-json`. */
export const SWAGGER_PATH = 'docs';

/**
 * Construye el documento OpenAPI a partir de los controllers registrados.
 *
 * @remarks
 * Los esquemas de los DTOs y los resúmenes de cada endpoint los genera el
 * plugin de Swagger del CLI (ver `plugins` en nest-cli.json) a partir de los
 * tipos, de las reglas de class-validator y de los comentarios JSDoc.
 */
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('API de usuarios y logo')
    .setDescription(
      'CRUD de usuarios con RUT validado y logo con contador de visitas. ' +
        'Para los endpoints protegidos: obtén un token en POST /auth/login y ' +
        'úsalo con el botón "Authorize".',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config);
}

/** Publica la documentación interactiva (Swagger UI) en `/docs`. */
export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup(SWAGGER_PATH, app, createOpenApiDocument(app));
}
