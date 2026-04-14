import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEventStore1776071518507 implements MigrationInterface {
  name = "AddEventStore1776071518507";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "webhook_event" ADD CONSTRAINT "UQ_fa4fdad56b2b0994a0ebde08b2c" UNIQUE ("eventId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "webhook_event" DROP CONSTRAINT "UQ_fa4fdad56b2b0994a0ebde08b2c"`,
    );
  }
}
