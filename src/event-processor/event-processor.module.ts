import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { EventStore } from "src/event-store/entities/event-store.entity";

import { EventProcessorService } from "./event-processor.service";
import { EventProcessorCron } from "./event-processor.cron";
import { EventAdminController } from "./event-admin.controller";

import { PaymentModule } from "src/payment/payment.module";
import { EventStoreModule } from "src/event-store/event-store.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([EventStore]),
    PaymentModule,
    EventStoreModule,
  ],
  providers: [EventProcessorService, EventProcessorCron],
  controllers: [EventAdminController],
})
export class EventProcessorModule {}