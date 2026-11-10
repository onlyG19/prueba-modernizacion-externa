import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Habilita `unaccent`: la búsqueda de usuarios no distingue tildes ("perez"
 * encuentra a "Pérez"). Es una extensión "confiable" desde Postgres 13: la
 * puede crear el dueño de la base, sin ser superusuario.
 */
export class HabilitarUnaccent1794293944881 implements MigrationInterface {
  name = 'HabilitarUnaccent1794293944881';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS unaccent`);
  }
}
