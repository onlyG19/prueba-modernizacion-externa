import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cuentas para ingresar a la consola, creadas por el administrador. De la
 * contraseña solo se guarda su hash; el usuario es único.
 */
export class Cuentas1794347858918 implements MigrationInterface {
  name = 'Cuentas1794347858918';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "cuentas" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "username" character varying(30) NOT NULL, "password_hash" text NOT NULL, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_8220590818127abd8a8e830301e" UNIQUE ("username"), CONSTRAINT "PK_1176afa6e483a49bee4ad8d543e" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "cuentas"`);
  }
}
