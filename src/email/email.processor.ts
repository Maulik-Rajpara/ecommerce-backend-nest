// email.processor.ts
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { EmailService } from "./email.service";

interface EmailJobData {
  email: string;
  subject: string;
  html: string;
}

@Processor("email")
export class EmailProcessor extends WorkerHost {
  constructor(private emailService: EmailService) {
    super();
  }

  async process(job: Job<EmailJobData>) {
    const { email, subject, html } = job.data;

    await this.emailService.sendEmail(email, subject, html);
  }
}
