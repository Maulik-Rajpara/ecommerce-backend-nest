// src/event-processor/event-processor.cron.ts

import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { EventProcessorService } from "./event-processor.service";

@Injectable()
export class EventProcessorCron {
  constructor(private processor: EventProcessorService) {}

  @Cron("*/10 * * * * *") // every 10 sec
  async handle() {
    //console.log("⏰ Running event processor cron...");
    await this.processor.processEvents();
  }
}