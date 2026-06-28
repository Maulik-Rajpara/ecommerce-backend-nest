import { Controller, Logger } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { NotificationService } from "src/notification/notification.service";
import { UsersService } from "src/users/users.service";
import { KAFKA_TOPICS } from "../kafka-topics.constants";

interface OrderExpiredEvent {
  orderId: string;
  userId: string;
}

interface PaymentFailedEvent {
  orderId: string;
  userId: string;
}

@Controller()
export class OrderConsumer {
  private readonly logger = new Logger(OrderConsumer.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly userService: UsersService,
  ) {}

  // ================= ORDER EXPIRED =================
  @EventPattern(KAFKA_TOPICS.ORDER_EXPIRED)
  async handleOrderExpired(@Payload() data: OrderExpiredEvent) {
    try {
      this.logger.log("📩 order-expired event received");

      const { orderId, userId } = data;

      const user = await this.userService.findBasicById(userId);
      if (!user) {
        this.logger.warn(
          `⚠️ User with ID ${userId} not found for order ${orderId}`,
        );
        return;
      }

      await this.notificationService.sendOrderCancelled({
        orderId,
        userId,
        email: user?.email,
      });

      this.logger.log("✅ Order cancelled email sent");
    } catch (err) {
      this.logger.error("❌ Order expired consumer failed", err);
    }
  }

  @EventPattern(KAFKA_TOPICS.PAYMENT_FAILED)
  async handlePaymentFailed(@Payload() data: PaymentFailedEvent) {
    try {
      this.logger.log("📩 payment-failed event received");

      const user = await this.userService.findBasicById(data.userId);
      await this.notificationService.sendPaymentFailed({
        orderId: data.orderId,
        userId: data.userId,
        email: user?.email,
      });
    } catch (err) {
      this.logger.error("❌ Payment failed consumer failed", err);
    }
  }
}
