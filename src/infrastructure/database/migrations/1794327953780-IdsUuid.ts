import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El id de los usuarios pasa de serial a UUID: los ids correlativos permitían
 * recorrer la tabla (/usuarios/1, /usuarios/2…) y revelaban cuántos hay.
 *
 * @remarks Los usuarios existentes reciben un UUID nuevo. `gen_random_uuid()`
 * viene incluida desde Postgres 13: no requiere extensiones.
 */
export class IdsUuid1794327953780 implements MigrationInterface {
  name = 'IdsUuid1794327953780';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP CONSTRAINT "PK_d7281c63c176e152e4c531594a8"`,
    );
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "usuarios" RENAME COLUMN "uuid" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY ("id")`,
    );
  }

  /** Vuelve a ids seriales; se numeran de nuevo (los UUID se pierden). */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP CONSTRAINT "PK_d7281c63c176e152e4c531594a8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" RENAME COLUMN "id" TO "uuid"`,
    );
    await queryRunner.query(`ALTER TABLE "usuarios" ADD "id" SERIAL NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "uuid"`);
  }
}
