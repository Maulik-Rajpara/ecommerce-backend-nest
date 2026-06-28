import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EventStore } from "./entities/event-store.entity";
import { EventStoreService } from "./event-store.service";
import { OutboxProcessor } from "./outbox.processor";
import { KafkaModule } from "src/kafka/kafka.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([EventStore]),
    KafkaModule,
  ],
  providers: [EventStoreService, OutboxProcessor],
  exports: [EventStoreService],
})
export class EventStoreModule {}
