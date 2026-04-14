import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExpiresAtToOrder1775832052065 implements MigrationInterface {
  name = "AddExpiresAtToOrder1775832052065";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD "expiresAt" TIMESTAMP`);
    await queryRunner.query(
      `CREATE INDEX "IDX_0d65ce2454954e71c67ea424c4" ON "payments" ("razorpayOrderId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_151b79a83ba240b0cb31b2302d" ON "orders" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_61736e2399fff253cc785ce56b" ON "orders" ("razorpayOrderId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6e9c925ddfc6d89721eef8d95c" ON "orders" ("expiresAt") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6e9c925ddfc6d89721eef8d95c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_61736e2399fff253cc785ce56b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_151b79a83ba240b0cb31b2302d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0d65ce2454954e71c67ea424c4"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "expiresAt"`);
  }
}
