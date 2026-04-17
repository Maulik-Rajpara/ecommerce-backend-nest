import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { NotifcationGateway } from "src/gateway/notification.gateway";

interface OrderNotificationPayload {
  orderId: string;
  userId: string;
  email?: string;
}

@Injectable()
export class NotificationService {
  constructor(
    private gateway: NotifcationGateway,
    @InjectQueue("email") private emailQueue: Queue,
  ) {}

  async sendOrderPaid(payload: OrderNotificationPayload) {
    this.gateway.notifyUser(payload.userId, {
      type: "ORDER_PAID",
      payload: {
        orderId: payload.orderId,
      },
    });

    if (payload.email) {
      await this.emailQueue.add("send-email", {
        email: payload.email,
        subject: "Order Paid",
        html: `<h3>Your order ${payload.orderId} is successful</h3>`,
      });
    }
  }

  async sendOrderCancelled(payload: OrderNotificationPayload) {
    this.gateway.notifyUser(payload.userId, {
      type: "ORDER_CANCELLED",
      payload: {
        orderId: payload.orderId,
      },
    });

    if (payload.email) {
      await this.emailQueue.add("send-email", {
        email: payload.email,
        subject: "Order Cancelled",
        html: `<h3>Your order ${payload.orderId} has been cancelled</h3>`,
      });
    }
  }

  async sendRefundSuccess(data: {
    orderId: string;
    userId: string;
    email?: string;
  }) {

    console.log("📧 Refund success mail:", data);

     this.gateway.notifyUser(data.userId, {
      type: "ORDER_PAID",
      payload: {
        orderId: data.orderId,
      },
    });

    if (data.email) {
      await this.emailQueue.add("send-email", {
        email: data.email,
        subject: "Refund Successful",
        html: `<h3>Your refund ${data.orderId} is successful</h3>`,
      });
    }
  }

  async sendRefundFailed(data: { refundId: string }) {
    // no need to notify user for now, since refund failure can be retried automatically
    console.log("📧 Refund failed mail:", data);
  }
}
