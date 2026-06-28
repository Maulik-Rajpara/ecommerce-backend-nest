// src/event-processor/event-processor.cron.ts

import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { EventProcessorService } from "./event-processor.service";

@Injectable()
export class EventProcessorCron {
  constructor(private processor: EventProcessorService) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  // every 10 sec
  async handle() {
    //console.log("⏰ Running event processor cron...");
    await this.processor.processEvents();
  }
}
