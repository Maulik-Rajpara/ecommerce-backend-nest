// email.processor.ts
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

import { OrderService } from "./order.service";

interface OrderExpiryJobData {
  orderId: string;
}

@Processor("order-expiry")
export class OrderExpiryProcessor extends WorkerHost {
  constructor(private orderService: OrderService) {
    super();
  }

  async process(job: Job<OrderExpiryJobData>) {
    const { orderId } = job.data;
    await this.orderService.expireOrder(orderId);
  }
}
