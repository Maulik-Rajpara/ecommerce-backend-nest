import { Module } from "@nestjs/common";
import { EventProcessorService } from "./event-processor.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EventStore } from "src/event-store/entities/event-store.entity";
import { EventProcessorCron } from "./event-processor.cron";
import { PaymentModule } from "src/payment/payment.module";

import { EventStoreService } from "src/event-store/event-store.service";
import { EventAdminController } from "./event-admin.controller";

@Module({
  imports: [TypeOrmModule.forFeature([EventStore]), PaymentModule],
  providers: [EventProcessorService, EventProcessorCron, EventStoreService],
  controllers: [EventAdminController],
})
export class EventProcessorModule {}
