// email.processor.ts
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { EmailService } from "./email.service";
import { QUEUES } from "src/async/async.constants";

interface EmailJobData {
  email: string;
  subject: string;
  html: string;
}

@Processor(QUEUES.EMAIL)
export class EmailProcessor extends WorkerHost {
  constructor(private emailService: EmailService) {
    super();
  }

  async process(job: Job<EmailJobData>) {
    const { email, subject, html } = job.data;

    await this.emailService.sendEmail(email, subject, html);
  }
}
