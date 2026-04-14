// src/event-store/event-store.module.ts

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EventStore } from "./entities/event-store.entity";
import { EventStoreService } from "./event-store.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([EventStore]), // 🔥 REQUIRED
  ],
  providers: [EventStoreService],
  exports: [EventStoreService], // 🔥 IMPORTANT (use in webhook)
})
export class EventStoreModule {}
