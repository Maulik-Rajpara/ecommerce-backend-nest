import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { NotifcationGateway } from "src/gateway/notification.gateway";
import { JOBS, QUEUES, RETRY_OPTIONS } from "src/async/async.constants";
import {
  orderPaidEmail,
  orderCancelledEmail,
  refundSuccessEmail,
  refundFailedEmail,
  paymentFailedEmail,
} from "src/email/email.templates";

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
      payload: { orderId: payload.orderId },
    });

    if (payload.email) {
      await this.emailQueue.add(
        JOBS.EMAIL_SEND,
        {
          email: payload.email,
          subject: `Order Confirmed – #${payload.orderId.slice(0, 8).toUpperCase()}`,
          html: orderPaidEmail(payload.orderId),
        },
        RETRY_OPTIONS.EMAIL,
      );
    }
  }

  async sendOrderCancelled(payload: OrderNotificationPayload) {
    this.gateway.notifyUser(payload.userId, {
      type: "ORDER_CANCELLED",
      payload: { orderId: payload.orderId },
    });

    if (payload.email) {
      await this.emailQueue.add(
        JOBS.EMAIL_SEND,
        {
          email: payload.email,
          subject: `Order Cancelled – #${payload.orderId.slice(0, 8).toUpperCase()}`,
          html: orderCancelledEmail(payload.orderId),
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
      type: "REFUND_SUCCESS",
      payload: { orderId: data.orderId },
    });

    if (data.email) {
      await this.emailQueue.add(
        JOBS.EMAIL_SEND,
        {
          email: data.email,
          subject: `Refund Processed – #${data.orderId.slice(0, 8).toUpperCase()}`,
          html: refundSuccessEmail(data.orderId),
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
        subject: "Your Refund is Being Retried – ShopNest",
        html: refundFailedEmail(data.refundId),
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
      payload: { orderId: data.orderId },
    });

    if (!data.email) return;
    await this.emailQueue.add(
      JOBS.EMAIL_SEND,
      {
        email: data.email,
        subject: `Payment Failed – Order #${data.orderId.slice(0, 8).toUpperCase()}`,
        html: paymentFailedEmail(data.orderId),
      },
      RETRY_OPTIONS.EMAIL,
    );
  }
}
