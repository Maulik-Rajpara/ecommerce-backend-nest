import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PaymentService } from "src/payment/payment.service";
import { QUEUES } from "src/async/async.constants";

interface RefundRetryJobData {
  refundId: string;
}

@Processor(QUEUES.REFUND_RETRY)
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
