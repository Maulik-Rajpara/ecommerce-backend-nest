import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PaymentService } from "src/payment/payment.service";
import { QUEUES } from "src/async/async.constants";

interface RefundRetryJobData {
  refundId: string;
}

@Processor(QUEUES.REFUND_RETRY)
export class RefundRetryProcessor extends WorkerHost {
  private readonly logger = new Logger(RefundRetryProcessor.name);

  constructor(private paymentService: PaymentService) {
    super();
  }

  async process(job: Job<RefundRetryJobData>) {
    const { refundId } = job.data;
    this.logger.log(`Processing refund retry for refundId: ${refundId}`);
    await this.paymentService.retryRefund(refundId);
  }
}
