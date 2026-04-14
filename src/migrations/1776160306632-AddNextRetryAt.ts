import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNextRetryAt1776160306632 implements MigrationInterface {
  name = "AddNextRetryAt1776160306632";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_store" ADD "nextRetryAt" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_store" DROP COLUMN "nextRetryAt"`,
    );
  }
}
