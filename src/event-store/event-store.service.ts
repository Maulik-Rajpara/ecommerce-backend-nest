// src/event-store/event-store.service.ts

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EventDirection, EventStore } from "./entities/event-store.entity";
import { Repository } from "typeorm";
import { KafkaEventMap } from "./domain-events";
import { randomUUID } from "crypto";

@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name);

  constructor(
    @InjectRepository(EventStore)
    private repo: Repository<EventStore>,
  ) {}

  async createEvent(data: {
    type: string;
    aggregateId: string;
    payload: any;
    idempotencyKey: string;
    direction: EventDirection;
  }) {
    const exists = await this.repo.findOne({
      where: { idempotencyKey: data.idempotencyKey },
    });

    if (exists) {
      this.logger.warn(`Duplicate event skipped: ${data.idempotencyKey}`);
      return exists;
    }

    return this.repo.save(data);
  }

  async createOutboxEvent<T extends keyof KafkaEventMap>(data: {
      type: T;
      aggregateId: string;
      payload: KafkaEventMap[T];
    }) {
      return this.repo.save({
        ...data,
        direction: EventDirection.OUTGOING,
        idempotencyKey: randomUUID(),
      });
    }

  async getEvents(status?: string, page = 1, limit = 20) {
    try {
      const take = Math.min(Number(limit), 100);
      const skip = (Number(page) - 1) * take;

      const query = this.repo.createQueryBuilder("event");

      if (status) {
        query.where("event.status = :status", { status });
      }

      const [events, total] = await query
        .orderBy("event.createdAt", "DESC")
        .skip(skip)
        .take(take)
        .getManyAndCount();

      return {
        statusCode: 200,
        data: events,
        meta: {
          total,
          page: Number(page),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      };
    } catch (error) {
      this.logger.error("Error fetching events", error instanceof Error ? error.stack : error);
      throw error;
    }
  }
}
