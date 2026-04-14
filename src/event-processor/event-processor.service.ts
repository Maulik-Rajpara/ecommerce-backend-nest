import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EventStatus, EventStore } from "src/event-store/entities/event-store.entity";
import { KafkaService } from "src/kafka/kafka.service";
import { PaymentService } from "src/payment/payment.service";
import { LessThanOrEqual, Repository } from "typeorm";
const now = new Date();
@Injectable()
export class EventProcessorService {
  constructor(
    @InjectRepository(EventStore)
    private eventRepo: Repository<EventStore>,

   // private paymentService: PaymentService,
    private kafkaService: KafkaService,
  ) {}

  async processEvents() {
    const events = await this.eventRepo.find({
     where: [
        { status: EventStatus.PENDING },
        { status: EventStatus.FAILED, nextRetryAt: LessThanOrEqual(now) },
      ],
      take: 10,
    });

    
    for (const event of events) {
      try {
        event.status = EventStatus.PROCESSING;
        await this.eventRepo.save(event);

        if (event.retryCount > 3) {
            event.status = EventStatus.DEAD;

            // 💀 send to DLQ
            await this.kafkaService.emit('payment.dlq', {
              eventId: event.id,
              type: event.type,
              error: event.error,
            });

            await this.eventRepo.save(event);
          continue;
        }

        await this.handleEvent(event);

        event.status = EventStatus.PROCESSED;
        await this.eventRepo.save(event);
      } catch (err) {
        event.retryCount += 1;
        event.status = EventStatus.FAILED;
        event.error = err.message;

        const delay = 1000 * 60 * event.retryCount; // 1min, 2min, 3min...
        event.nextRetryAt = new Date(Date.now() + delay);
        console.error("❌ Error processing event:", err);

        await this.eventRepo.save(event);
      }
    }
  }

  // async handleEvent(event: EventStore) {
  //   const payload = event.payload;

  //   switch (event.type) {
  //     case "payment.captured":
  //       await this.paymentService.markPaymentSuccess(
  //         payload.payload.payment.entity,
  //       );
  //       break;

  //     case "payment.failed":
  //       await this.paymentService.markPaymentFailed(
  //         payload.payload.payment.entity,
  //       );
  //       break;

  //     case "refund.processed":
  //       await this.paymentService.handleRefundSuccess(payload.payload);
  //       break;

  //     case "refund.failed":
  //       await this.paymentService.handleRefundFailed(payload.payload);
  //       break;

  //     default:
  //       console.log("⚠️ Unknown event:", event.type);
  //   }
  // }

  async handleEvent(event: EventStore) {
    const payload = event.payload;

    switch (event.type) {
      case "payment.captured":
        console.log(`⏳ Processing ${payload.payload.payment.entity.id} events...`);
       
        await this.kafkaService.emit('payment-success', {
          orderId: payload.payload.payment.entity.order_id,
          paymentId: payload.payload.payment.entity.id,
        });
        break;

      case "payment.failed":
        await this.kafkaService.emit('payment.failed', {
           orderId: payload.payload.payment.entity.order_id,
          paymentId: payload.payload.payment.entity.id,
        });
        break;

      case "refund.processed":
        await this.kafkaService.emit('refund.success', {
          orderId: payload.payload.payment.entity.notes?.orderId,
        });
        break;

      case "refund.failed":
        await this.kafkaService.emit('refund.failed', {
          orderId: payload.payload.payment.entity.notes?.orderId,
        });
        break;

      default:
        console.log("⚠️ Unknown event:", event.type);
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