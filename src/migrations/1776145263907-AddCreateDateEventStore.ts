import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCreateDateEventStore1776145263907 implements MigrationInterface {
    name = 'AddCreateDateEventStore1776145263907'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "event_store" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TYPE "public"."event_store_status_enum" RENAME TO "event_store_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."event_store_status_enum" AS ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD')`);
        await queryRunner.query(`ALTER TABLE "event_store" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "event_store" ALTER COLUMN "status" TYPE "public"."event_store_status_enum" USING "status"::"text"::"public"."event_store_status_enum"`);
        await queryRunner.query(`ALTER TABLE "event_store" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."event_store_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."event_store_status_enum_old" AS ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')`);
        await queryRunner.query(`ALTER TABLE "event_store" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "event_store" ALTER COLUMN "status" TYPE "public"."event_store_status_enum_old" USING "status"::"text"::"public"."event_store_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "event_store" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."event_store_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."event_store_status_enum_old" RENAME TO "event_store_status_enum"`);
        await queryRunner.query(`ALTER TABLE "event_store" DROP COLUMN "createdAt"`);
    }

}
