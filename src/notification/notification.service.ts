import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { NotifcationGateway } from "src/gateway/notification.gateway";
import { JOBS, QUEUES, RETRY_OPTIONS } from "src/async/async.constants";

interface OrderNotificationPayload {
  orderId: string;
  userId: string;
  email?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private gateway: NotifcationGateway,
    @InjectQueue(QUEUES.EMAIL) private emailQueue: Queue,
  ) {}

  async sendOrderPaid(payload: OrderNotificationPayload) {
    this.gateway.notifyUser(payload.userId, {
      type: "ORDER_PAID",
      payload: {
        orderId: payload.orderId,
      },
    });

    if (payload.email) {
      await this.emailQueue.add(
        JOBS.EMAIL_SEND,
        {
          email: payload.email,
          subject: "Order Paid",
          html: `<h3>Your order ${payload.orderId} is successful</h3>`,
        },
        RETRY_OPTIONS.EMAIL,
      );
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
      await this.emailQueue.add(
        JOBS.EMAIL_SEND,
        {
          email: payload.email,
          subject: "Order Cancelled",
          html: `<h3>Your order ${payload.orderId} has been cancelled</h3>`,
        },
        RETRY_OPTIONS.EMAIL,
      );
    }
  }

  async sendRefundSuccess(data: {
    orderId: string;
    userId: string;
    email?: string;
  }) {
    this.logger.log(`Sending refund success notification for orderId: ${data.orderId}`);

    this.gateway.notifyUser(data.userId, {
      type: "ORDER_PAID",
      payload: {
        orderId: data.orderId,
      },
    });

    if (data.email) {
      await this.emailQueue.add(
        JOBS.EMAIL_SEND,
        {
          email: data.email,
          subject: "Refund Successful",
          html: `<h3>Your refund ${data.orderId} is successful</h3>`,
        },
        RETRY_OPTIONS.EMAIL,
      );
    }
  }

  async sendRefundFailed(data: { refundId: string; email?: string }) {
    if (!data.email) return;
    await this.emailQueue.add(
      JOBS.EMAIL_SEND,
      {
        email: data.email,
        subject: "Refund Processing Delayed",
        html: `<h3>Refund ${data.refundId} is delayed. Our system will keep retrying automatically.</h3>`,
      },
      RETRY_OPTIONS.EMAIL,
    );
  }

  async sendPaymentFailed(data: {
    orderId: string;
    userId: string;
    email?: string;
  }) {
    this.gateway.notifyUser(data.userId, {
      type: "PAYMENT_FAILED",
      payload: {
        orderId: data.orderId,
      },
    });

    if (!data.email) return;
    await this.emailQueue.add(
      JOBS.EMAIL_SEND,
      {
        email: data.email,
        subject: "Payment Failed - Order Cancelled",
        html: `<h3>Your payment for order ${data.orderId} failed and the order was cancelled.</h3>`,
      },
      RETRY_OPTIONS.EMAIL,
    );
  }
}
