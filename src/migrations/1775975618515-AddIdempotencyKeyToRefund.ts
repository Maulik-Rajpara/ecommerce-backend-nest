import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIdempotencyKeyToRefund1775975618515 implements MigrationInterface {
    name = 'AddIdempotencyKeyToRefund1775975618515'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refunds" ADD "idempotencyKey" character varying`);
        await queryRunner.query(`ALTER TABLE "refunds" ADD CONSTRAINT "UQ_1b692560d438e5fc6edebbb27dd" UNIQUE ("idempotencyKey")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refunds" DROP CONSTRAINT "UQ_1b692560d438e5fc6edebbb27dd"`);
        await queryRunner.query(`ALTER TABLE "refunds" DROP COLUMN "idempotencyKey"`);
    }

}
