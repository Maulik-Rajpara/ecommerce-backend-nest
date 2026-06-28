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
    @Query("page", new ParseIntPipe({ optional: true })) page = 1,
    @Query("limit", new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.eventStore.getEvents(status, page, limit);
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
