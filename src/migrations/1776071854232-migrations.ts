import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1776071854232 implements MigrationInterface {
    name = 'Migrations1776071854232'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."event_store_status_enum" AS ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "event_store" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying NOT NULL, "aggregateId" character varying NOT NULL, "payload" jsonb NOT NULL, "idempotencyKey" character varying NOT NULL, "status" "public"."event_store_status_enum" NOT NULL DEFAULT 'PENDING', "retryCount" integer NOT NULL DEFAULT '0', "error" character varying, CONSTRAINT "UQ_555d80242eaf3a568741d01487e" UNIQUE ("idempotencyKey"), CONSTRAINT "PK_f112deaffb65c3866e4d3f0fd13" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "event_store"`);
        await queryRunner.query(`DROP TYPE "public"."event_store_status_enum"`);
    }

}
