import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RUT único y de largo 10 (#2, #22), preservando los datos existentes.
 *
 * @remarks
 * `migration:generate` proponía `DROP COLUMN "rut"` + `ADD`, lo que borraría
 * todos los RUTs. Se reescribió a mano con `ALTER COLUMN ... TYPE`.
 * Postgres valida las precondiciones: si algún RUT supera 10 caracteres o hay
 * duplicados, la migración falla y se revierte completa.
 */
export class RutUnicoYLargo101794285436456 implements MigrationInterface {
  name = 'RutUnicoYLargo101794285436456';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "usuarios" SET "rut" = UPPER("rut")`);
    await queryRunner.query(
      `ALTER TABLE "usuarios" ALTER COLUMN "rut" TYPE character varying(10)`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD CONSTRAINT "UQ_9e90b993976dcd8bdabf4e3159d" UNIQUE ("rut")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP CONSTRAINT "UQ_9e90b993976dcd8bdabf4e3159d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ALTER COLUMN "rut" TYPE character varying(12)`,
    );
  }
}
