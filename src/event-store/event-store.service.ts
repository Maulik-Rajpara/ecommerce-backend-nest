// src/event-store/event-store.service.ts

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EventStore } from "./entities/event-store.entity";
import { Repository } from "typeorm";

@Injectable()
export class EventStoreService {
  constructor(
    @InjectRepository(EventStore)
    private repo: Repository<EventStore>,
  ) {}

  async createEvent(data: {
    type: string;
    aggregateId: string;
    payload: any;
    idempotencyKey: string;
  }) {
    const exists = await this.repo.findOne({
      where: { idempotencyKey: data.idempotencyKey },
    });

    if (exists) {
      console.log("⚠️ Duplicate event skipped:", data.idempotencyKey);
      return exists;
    }

    return this.repo.save(data);
  }

  async getEvents(status?: string, limit: number = 20) {
    try {
      const query = this.repo.createQueryBuilder("event");

      if (status) {
        query.where("event.status = :status", { status });
      }

      const events = await query
        .orderBy("event.createdAt", "DESC")
        .limit(limit)
        .getMany();

      return {
        statusCode: 200,
        data: events,
      };
    } catch (error) {
      console.error("Error fetching events:", error);
      throw error;
    }
  }
}
