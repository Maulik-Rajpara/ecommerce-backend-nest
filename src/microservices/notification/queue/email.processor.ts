// email.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailService } from '../services/email.service';



@Processor('email')
export class EmailProcessor extends WorkerHost {
  constructor(private emailService: EmailService) {
    super();
  }

  async process(job: Job<any>) {
    const { email, subject, html } = job.data;

    await this.emailService.sendEmail(email, subject, html);
  }
}