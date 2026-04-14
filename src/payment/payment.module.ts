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

@Module({
  imports: [
    BullModule.registerQueue({
      name: "payment-retry",
    }),
    TypeOrmModule.forFeature([Payment, Refund]),
    OrderModule,
    KafkaModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentRetryProcessor],
  exports: [PaymentService, BullModule],
})
export class PaymentModule {}
