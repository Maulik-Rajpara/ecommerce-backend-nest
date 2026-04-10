import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCart1775494256172 implements MigrationInterface {
    name = 'AddCart1775494256172'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "carts" DROP COLUMN "dummy"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "carts" ADD "dummy" character varying NOT NULL DEFAULT 'test'`);
    }

}
