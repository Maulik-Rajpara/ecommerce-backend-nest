import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRefund1775970432901 implements MigrationInterface {
    name = 'AddRefund1775970432901'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."refunds_status_enum" AS ENUM('INITIATED', 'SUCCESS', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "refunds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "paymentId" uuid NOT NULL, "amount" numeric(10,2) NOT NULL, "razorpayRefundId" character varying, "status" "public"."refunds_status_enum" NOT NULL DEFAULT 'INITIATED', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5106efb01eeda7e49a78b869738" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "refunds" ADD CONSTRAINT "FK_a276dea330e561499e4a6e1b309" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refunds" DROP CONSTRAINT "FK_a276dea330e561499e4a6e1b309"`);
        await queryRunner.query(`DROP TABLE "refunds"`);
        await queryRunner.query(`DROP TYPE "public"."refunds_status_enum"`);
    }

}
