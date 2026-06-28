import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { Order, OrderStatus } from "./entities/order.entity";
import { OrderService } from "./order.service";
import { CRON_SCHEDULES } from "src/async/async.constants";

@Injectable()
export class OrderCronService {
  private readonly logger = new Logger(OrderCronService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    private orderService: OrderService,
  ) {}

  // ⏰ runs every 15 minutes
  @Cron(CRON_SCHEDULES.ORDER_EXPIRY_SWEEP)
  async handleOrderExpiry() {
    this.logger.log("⏳ Checking expired orders...");

    try {
      // 1️⃣ fetch expired orders
      const expiredOrders = await this.orderRepo.find({
        where: {
          status: OrderStatus.PENDING,
          expiresAt: LessThan(new Date()),
        },
      });

      if (!expiredOrders.length) return;

      // Use the same expire flow as queue worker to keep side effects consistent.
      await Promise.all(
        expiredOrders.map((order) => this.orderService.expireOrder(order.id)),
      );

      this.logger.log({
        message: "Expired orders cleanup",
        count: expiredOrders.length,
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
