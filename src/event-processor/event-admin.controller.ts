import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseIntPipe,
} from "@nestjs/common";
import { EventProcessorService } from "./event-processor.service";
import { EventStoreService } from "src/event-store/event-store.service";

@Controller("event-admin")
export class EventAdminController {
  constructor(
    private readonly processor: EventProcessorService,
    private readonly eventStore: EventStoreService,
  ) {}

  // ================= LIST EVENTS =================
  @Get("events")
  async getEvents(
    @Query("status") status?: string,
    @Query("limit", ParseIntPipe) limit: number = 20,
  ) {
    return this.eventStore.getEvents(status, limit);
  }

  // ================= PROCESS PENDING =================
  @Post("process")
  async processEvents() {
    await this.processor.processEvents();

    return {
      message: "Event processing triggered manually",
    };
  }

  // ================= RETRY FAILED EVENT =================
  @Post(":id/retry")
  async retryEvent(@Param("id") id: string) {
    return this.processor.retryEvent(id);
  }
}
