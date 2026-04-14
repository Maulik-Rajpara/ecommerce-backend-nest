
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRetryCountPaymentEntity1775908317529 implements MigrationInterface {
    name = 'AddRetryCountPaymentEntity1775908317529'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" ADD "retryCount" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "retryCount"`);
    }

}
