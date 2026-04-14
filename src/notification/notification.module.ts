import { Module } from '@nestjs/common';

import { BullModule } from '@nestjs/bullmq';
import { NotifcationGateway } from '../gateway/notification.gateway';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  providers: [NotificationService, NotifcationGateway],
  exports: [NotificationService],
})
export class NotificationModule {}