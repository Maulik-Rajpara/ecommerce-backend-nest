import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { NotificationGateway } from "../gateway/notification.gateway";


@Injectable()
export class NotificationService {
  constructor(
    private gateway: NotificationGateway,
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  async sendOrderPaid(payload: any) {
    this.gateway.notifyUser(payload.userId, {
      type: 'ORDER_PAID',
      orderId: payload.orderId,
    });

    await this.emailQueue.add('send-email', {
      email: payload.email,
      subject: 'Order Paid',
      html: `<h3>Your order ${payload.orderId} is successful</h3>`,
    });
  }

  async sendOrderCancelled(payload: any) {
    this.gateway.notifyUser(payload.userId, {
      type: 'ORDER_CANCELLED',
      orderId: payload.orderId,
    });

    await this.emailQueue.add('send-email', {
      email: payload.email,
      subject: 'Order Cancelled',
      html: `<h3>Your order ${payload.orderId} has been cancelled</h3>`,
    });
  }
}