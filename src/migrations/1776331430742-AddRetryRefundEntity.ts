import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRetryRefundEntity1776331430742 implements MigrationInterface {
    name = 'AddRetryRefundEntity1776331430742'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refunds" ADD "retryCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "image"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "image" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "image"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "image" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "refunds" DROP COLUMN "retryCount"`);
    }

}
