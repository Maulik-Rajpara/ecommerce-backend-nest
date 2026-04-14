import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWebhookEvent1775999161906 implements MigrationInterface {
    name = 'AddWebhookEvent1775999161906'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "webhook_event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "eventId" character varying NOT NULL, "eventType" character varying NOT NULL, CONSTRAINT "PK_0f56d2f40f5ec823acf8e8edad1" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "webhook_event"`);
    }

}
