import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1779280168371 implements MigrationInterface {
  name = "Migrations1779280168371";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // enum create
    await queryRunner.query(`
      CREATE TYPE "public"."event_store_direction_enum"
      AS ENUM('INCOMING', 'OUTGOING')
    `);

    // nullable first
    await queryRunner.query(`
      ALTER TABLE "event_store"
      ADD "direction"
      "public"."event_store_direction_enum"
    `);

    // existing rows fix
    await queryRunner.query(`
      UPDATE "event_store"
      SET "direction" = 'INCOMING'
      WHERE "direction" IS NULL
    `);

    // now make not null
    await queryRunner.query(`
      ALTER TABLE "event_store"
      ALTER COLUMN "direction" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "event_store"
      DROP COLUMN "direction"
    `);

    await queryRunner.query(`
      DROP TYPE "public"."event_store_direction_enum"
    `);
  }
}