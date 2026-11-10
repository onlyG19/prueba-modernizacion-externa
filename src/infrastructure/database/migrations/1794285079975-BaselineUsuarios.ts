import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Esquema original de `usuarios`, tal como lo creó `synchronize`.
 * En una BD existente se marca como aplicada con `--fake`; en una BD vacía la crea.
 */
export class BaselineUsuarios1794285079975 implements MigrationInterface {
  name = 'BaselineUsuarios1794285079975';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "usuarios" ("id" SERIAL NOT NULL, "nombre" character varying(45) NOT NULL, "rut" character varying(12) NOT NULL, CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "usuarios"`);
  }
}
