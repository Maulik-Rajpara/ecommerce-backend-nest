import { Controller, Logger } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { NotificationService } from "src/notification/notification.service";
import { UsersService } from "src/users/users.service";

@Controller()
export class OrderConsumer {
  private readonly logger = new Logger(OrderConsumer.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly userService: UsersService,
  ) {}

  // ================= ORDER EXPIRED =================
  @EventPattern("order-expired")
  async handleOrderExpired(@Payload() data: any) {
    try {
      this.logger.log("📩 order-expired event received");

      const { orderId, userId } = data;

      const user = await this.userService.findBasicById(userId);
      if(!user) {
        this.logger.warn(`⚠️ User with ID ${userId} not found for order ${orderId}`);
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
}