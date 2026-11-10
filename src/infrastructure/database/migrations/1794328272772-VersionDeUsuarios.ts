import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Versión de cada usuario para la concurrencia optimista: sube con cada
 * cambio, y un PATCH con `If-Match` solo se aplica si sigue siendo la misma.
 */
export class VersionDeUsuarios1794328272772 implements MigrationInterface {
  name = 'VersionDeUsuarios1794328272772';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD "version" integer NOT NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "version"`);
  }
}
