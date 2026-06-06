import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import {
  EventDirection,
  EventStatus,
  EventStore,
} from "./entities/event-store.entity";
import { Repository } from "typeorm";
import { KafkaService } from "src/kafka/kafka.service";

@Injectable()
export class OutboxProcessor {
  constructor(
    @InjectRepository(EventStore)
    private repo: Repository<EventStore>,
    private kafkaService: KafkaService,
  ) {}

  @Cron("*/5 * * * * *")
  async processOutbox() {
    const events = await this.repo.find({
      where: {
        direction: EventDirection.OUTGOING,
        status: EventStatus.PENDING,
      },
      take: 20,
      order: {
        createdAt: "ASC",
      },
    });

    for (const event of events) {
      try {
        event.status = EventStatus.PROCESSING;
        await this.repo.save(event);

        await this.kafkaService.emit(event.type, event.payload);

        event.status = EventStatus.PROCESSED;
        await this.repo.save(event);
      } catch (err) {
        event.retryCount += 1;

        if (event.retryCount >= 3) {
          event.status = EventStatus.DEAD;
        } else {
          event.status = EventStatus.FAILED;
        }

        event.error =
          err instanceof Error ? err.message : "Kafka publish failed";

        await this.repo.save(event);
      }
    }
  }
}