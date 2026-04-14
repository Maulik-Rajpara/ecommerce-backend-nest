import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PaymentService } from './payment.service';

@Processor('payment-retry')
export class PaymentRetryProcessor extends WorkerHost {
  constructor(private paymentService: PaymentService) {
     super();
  }

 
  async process(job: Job<any>) {
    const { paymentId } = job.data;

    console.log('🔁 Processing retry for:', paymentId);

    await this.paymentService.retryPayment(paymentId);
  }
}