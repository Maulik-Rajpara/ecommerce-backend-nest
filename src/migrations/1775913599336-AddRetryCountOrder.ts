import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRetryCountOrder1775913599336 implements MigrationInterface {
    name = 'AddRetryCountOrder1775913599336'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "retryCount" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "retryCount"`);
    }

}
