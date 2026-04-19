import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PaymentService } from "./payment.service";
import { QUEUES } from "src/async/async.constants";

interface PaymentRetryJobData {
  paymentId: string;
}

@Processor(QUEUES.PAYMENT_RETRY)
export class PaymentRetryProcessor extends WorkerHost {
  constructor(private paymentService: PaymentService) {
    super();
  }

  async process(job: Job<PaymentRetryJobData>) {
    const { paymentId } = job.data;

    console.log("🔁 Processing retry for:", paymentId);

    await this.paymentService.retryPayment(paymentId);
  }
}
