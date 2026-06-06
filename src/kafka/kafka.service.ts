import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { lastValueFrom } from "rxjs";

@Injectable()
export class KafkaService implements OnModuleInit {
  private readonly logger = new Logger(KafkaService.name);

  constructor(@Inject("KAFKA_SERVICE") private readonly kafka: ClientKafka) {}

  async onModuleInit() {
    //this.kafka.subscribeToResponseOf("payment-success");
    await this.kafka.connect();
    this.logger.log("Kafka producer connected");
    // await new Promise((res) => setTimeout(res, 3000));
  }

  async emit(topic: string, message: Record<string, unknown>) {
    try {
      await lastValueFrom(this.kafka.emit(topic, message));
    } catch {
      this.logger.warn(`Kafka emit failed for topic ${topic}, retrying...`);
      // await new Promise((res) => setTimeout(res, 2000));
      await lastValueFrom(this.kafka.emit(topic, message));
    }
  }
}
