import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  EventStatus,
  EventStore,
} from "src/event-store/entities/event-store.entity";
import { PaymentService } from "src/payment/payment.service";
import { Brackets, DataSource, Repository } from "typeorm";

@Injectable()
export class EventProcessorService {
  constructor(
    @InjectRepository(EventStore)
    private eventRepo: Repository<EventStore>,
    private paymentService: PaymentService,
    private dataSource: DataSource,
  ) {}

  async processEvents() {
    const events = await this.claimEvents(10);

    for (const event of events) {
      try {
        if (event.retryCount >= 3) {
          event.status = EventStatus.DEAD;

          await this.eventRepo.save(event);
          continue;
        }

        await this.handleEvent(event);

        event.status = EventStatus.PROCESSED;
        await this.eventRepo.save(event);
      } catch (err) {
        event.retryCount += 1;
        event.status = EventStatus.FAILED;
        event.error =
          err instanceof Error ? err.message : "Unknown event processing error";

        const delay = 1000 * 60 * event.retryCount; // 1min, 2min, 3min...
        event.nextRetryAt = new Date(Date.now() + delay);
        console.error("❌ Error processing event:", err);

        await this.eventRepo.save(event);
      }
    }
  }

  private async claimEvents(limit: number): Promise<EventStore[]> {
    return this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const repo = manager.getRepository(EventStore);
      const events = await repo
        .createQueryBuilder("event")
        .where(
          new Brackets((qb) => {
            qb.where("event.status = :pending", {
              pending: EventStatus.PENDING,
            }).orWhere("event.status = :failed AND event.nextRetryAt <= :now", {
              failed: EventStatus.FAILED,
              now,
            });
          }),
        )
        .orderBy("event.createdAt", "ASC")
        .limit(limit)
        .setLock("pessimistic_write")
        .setOnLocked("skip_locked")
        .getMany();

      if (!events.length) {
        return [];
      }

      const eventIds = events.map((event) => event.id);
      await repo
        .createQueryBuilder()
        .update(EventStore)
        .set({ status: EventStatus.PROCESSING })
        .whereInIds(eventIds)
        .execute();

      return events.map((event) => ({
        ...event,
        status: EventStatus.PROCESSING,
      }));
    });
  }

  async handleEvent(event: EventStore) {
    const payload = event.payload as {
      payload?: {
        payment?: { entity?: { id?: string; order_id?: string } };
        refund?: { entity?: { id?: string } };
      };
    };

    switch (event.type) {
      case "payment.captured": {
        const paymentEntity = payload.payload?.payment?.entity;
        if (!paymentEntity?.id || !paymentEntity.order_id) {
          throw new Error("Missing payment payload");
        }
        await this.paymentService.markPaymentSuccess({
          id: paymentEntity.id,
          order_id: paymentEntity.order_id,
        });
        break;
      }

      case "payment.failed": {
        const paymentEntity = payload.payload?.payment?.entity;
        if (!paymentEntity?.id || !paymentEntity.order_id) {
          throw new Error("Missing payment payload");
        }
        await this.paymentService.markPaymentFailed({
          id: paymentEntity.id,
          order_id: paymentEntity.order_id,
        });
        break;
      }

      case "refund.processed":
        await this.paymentService.handleRefundSuccess(payload.payload);
        break;

      case "refund.failed":
        await this.paymentService.handleRefundFailed(payload.payload);
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
      //throw new Error(`Unknown event type: ${event.type}`);
    }
  }

  async retryEvent(eventId: string) {
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error("Event not found");
    }

    event.status = EventStatus.PENDING;
    event.retryCount = 0;
    //event.error = null;

    await this.eventRepo.save(event);

    return {
      message: "Event reset for retry",
    };
  }
}
