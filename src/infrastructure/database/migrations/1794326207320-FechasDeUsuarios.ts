import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fecha de registro y de último cambio de cada usuario (trazabilidad).
 *
 * @remarks Los usuarios que ya existían quedan con la fecha en que corre esta
 * migración: su fecha real nunca se registró.
 */
export class FechasDeUsuarios1794326207320 implements MigrationInterface {
  name = 'FechasDeUsuarios1794326207320';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios"
         ADD "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
         ADD "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN "actualizado_en", DROP COLUMN "creado_en"`,
    );
  }
}
