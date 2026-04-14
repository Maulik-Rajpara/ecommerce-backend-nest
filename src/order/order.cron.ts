import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Order, OrderStatus } from "./entities/order.entity";

@Injectable()
export class OrderCronService {
  private readonly logger = new Logger(OrderCronService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
  ) {}

  // ⏰ runs every 15 minutes
  @Cron("0 */15 * * * *")
  async handleOrderExpiry() {
    this.logger.log("⏳ Checking expired orders...");

    try {
      const result = await this.orderRepo
        .createQueryBuilder()
        .update(Order)
        .set({ status: OrderStatus.CANCELLED })
        .where("status = :status", { status: OrderStatus.PENDING })
        .andWhere("expiresAt IS NOT NULL")
        .andWhere("expiresAt < NOW()")
        .execute();

      this.logger.log({
        message: "Expired orders cleanup",
        affected: result.affected,
        timestamp: new Date(),
      });
    } catch (err) {
      this.logger.error(
        "❌ Cron failed",
        err instanceof Error ? err.stack : undefined,
      );
    }
  }
}
