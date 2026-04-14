import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Payment } from './entities/payment.entity';
import { OrderModule } from '../order/order.module';
import { BullModule } from '@nestjs/bullmq';
import { PaymentRetryProcessor } from './payment.retry.process';
import { NotifcationGateway } from '../gateway/notification.gateway';
//import { PaymentListener } from '../common/events/listeners/payment.listener';
import { EmailModule } from 'src/email/email.module';
import { UsersModule } from 'src/users/users.module';
import { User } from 'src/users/entities/user.entity';
import { Refund } from 'src/refund/entities/refund.entity';
import { RefundModule } from 'src/refund/refund.module';
import { PaymentWebhookController } from 'src/webhook/webhook.controller';
import { WebhookModule } from 'src/webhook/webhook.module';
import { KafkaModule } from 'src/kafka/kafka.module';
import { PaymentConsumer } from 'src/kafka/consumers/payment.consumer';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'payment-retry',
    }),
    EmailModule,
    UsersModule,
    RefundModule,
    TypeOrmModule.forFeature([Payment, User, Refund]), 
    OrderModule,
    KafkaModule,// ✅ VERY IMPORTANT,

  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentRetryProcessor, NotifcationGateway
     ],
  exports: [PaymentService,  BullModule],
})
export class PaymentModule {}