import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { PaymentService } from "./payment.service";
import { PaymentController } from "./payment.controller";
import { Payment } from "./entities/payment.entity";
import { OrderModule } from "../order/order.module";
import { BullModule } from "@nestjs/bullmq";
import { PaymentRetryProcessor } from "./payment.retry.process";
import { Refund } from "src/refund/entities/refund.entity";
import { KafkaModule } from "src/kafka/kafka.module";
import { RefundRetryProcessor } from "src/refund/refund-processor/refund.retry.processor";
import { QUEUES } from "src/async/async.constants";

import { NotificationModule } from "src/notification/notification.module";
import { UsersModule } from "src/users/users.module";

@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: QUEUES.PAYMENT_RETRY,
      },
      {
        name: QUEUES.REFUND_RETRY, // optional: for future refund retry logic
      },
    ),
    TypeOrmModule.forFeature([Payment, Refund]),
    OrderModule,
    KafkaModule,
    NotificationModule,
    UsersModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentRetryProcessor, RefundRetryProcessor],
  exports: [PaymentService, BullModule],
})
export class PaymentModule {}
