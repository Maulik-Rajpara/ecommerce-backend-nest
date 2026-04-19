import { Controller, Logger } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { NotificationService } from "src/notification/notification.service";
import { UsersService } from "src/users/users.service";
import { KAFKA_TOPICS } from "../kafka-topics.constants";

interface RefundSuccessEvent {
  orderId: string;
  userId: string;
}

interface RefundFailedEvent {
  refundId: string;
  userId?: string;
}

@Controller()
export class RefundConsumer {
  private readonly logger = new Logger(RefundConsumer.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly userService: UsersService,
  ) {
    console.log("RefundConsumer initialized");
  }

  // ================= REFUND SUCCESS =================
  @EventPattern(KAFKA_TOPICS.REFUND_SUCCESS)
  async handleRefundSuccess(@Payload() data: RefundSuccessEvent) {
    try {
      this.logger.log("📩 refund-success event received");

      const { orderId, userId } = data;

      const user = await this.userService.findBasicById(userId);

      // 🔥 user notification
      await this.notificationService.sendRefundSuccess({
        orderId,
        userId,
        email: user?.email,
      });

      this.logger.log("✅ Refund success notification sent");
    } catch (err) {
      this.logger.error("❌ Refund success consumer failed", err);
    }
  }

  // ================= REFUND FAILED =================
  @EventPattern(KAFKA_TOPICS.REFUND_FAILED)
  async handleRefundFailed(@Payload() data: RefundFailedEvent) {
    try {
      this.logger.log("📩 refund-failed event received");

      const { refundId, userId } = data;
      const user = userId ? await this.userService.findBasicById(userId) : null;

      await this.notificationService.sendRefundFailed({
        refundId,
        email: user?.email,
      });

      this.logger.log("⚠️ Refund failed notification sent");
    } catch (err) {
      this.logger.error("❌ Refund failed consumer error", err);
    }
  }
}
