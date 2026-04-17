import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PaymentService } from "src/payment/payment.service";


interface RefundRetryJobData {
  refundId: string;
}

@Processor("refund-retry")
export class RefundRetryProcessor extends WorkerHost {
  constructor(private paymentService: PaymentService) {
    super();
  }

  async process(job: Job<RefundRetryJobData>) {
    const { refundId } = job.data;

    console.log("🔁 Processing refund retry:", refundId);

    await this.paymentService.retryRefund(refundId);
  }
}