import { Module } from '@nestjs/common';

import { BullModule } from '@nestjs/bullmq';
import { NotificationService } from './services/notification.service';
import { EmailService } from './services/email.service';
import { EmailProcessor } from './queue/email.processor';
import { NotificationGateway } from './gateway/notification.gateway';


@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  providers: [
 
    NotificationService,
    EmailService,
    EmailProcessor,
    NotificationGateway,
  ],
  exports: [NotificationService],
})
export class NotificationMicroserviceModule {}