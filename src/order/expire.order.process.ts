// email.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { OrderService } from './order.service';

@Processor('order-expiry')
export class OrderExpiryProcessor extends WorkerHost {
  constructor(private orderService: OrderService) {
    super();
  }

  async process(job: Job<any>) {
    const { orderId } = job.data;
   await this.orderService.expireOrder(orderId);
  }
}