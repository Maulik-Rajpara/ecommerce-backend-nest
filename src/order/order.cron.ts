import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { Order, OrderStatus } from "./entities/order.entity";
import { KafkaService } from "src/kafka/kafka.service";

@Injectable()
export class OrderCronService {
  private readonly logger = new Logger(OrderCronService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    private kafkaService: KafkaService,
  ) {}

  // ⏰ runs every 15 minutes
  @Cron("0 */15 * * * *")
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

      // 2️⃣ extract ids
      const orderIds = expiredOrders.map((o) => o.id);

      // 3️⃣ bulk update
      await this.orderRepo
        .createQueryBuilder()
        .update(Order)
        .set({ status: OrderStatus.CANCELLED })
        .whereInIds(orderIds)
        .execute();

      await Promise.all(
        expiredOrders.map((order) =>
          this.kafkaService.emit("order-expired", {
            orderId: order.id,
            userId: order.userId,
          }),
        ),
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
