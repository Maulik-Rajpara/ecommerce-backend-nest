import { Controller, Logger } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { NotificationService } from "src/notification/notification.service";
import { UsersService } from "src/users/users.service";

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
  @EventPattern("refund-success")
  async handleRefundSuccess(@Payload() data: any) {
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
  @EventPattern("refund-failed")
  async handleRefundFailed(@Payload() data: any) {
    try {
      this.logger.log("📩 refund-failed event received");

      const { refundId } = data;

      // 🔥 optional: notify user
      await this.notificationService.sendRefundFailed({
        refundId,
      });

      this.logger.log("⚠️ Refund failed notification sent");
    } catch (err) {
      this.logger.error("❌ Refund failed consumer error", err);
    }
  }
}