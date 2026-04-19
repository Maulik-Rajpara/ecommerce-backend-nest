import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { lastValueFrom } from "rxjs";

@Injectable()
export class KafkaService implements OnModuleInit {
  constructor(@Inject("KAFKA_SERVICE") private readonly kafka: ClientKafka) {}

  async onModuleInit() {
    //this.kafka.subscribeToResponseOf("payment-success");
    await this.kafka.connect();
    console.log("📥 Kafka connect");
    // await new Promise((res) => setTimeout(res, 3000));
  }

  async emit(topic: string, message: Record<string, unknown>) {
    try {
      await lastValueFrom(this.kafka.emit(topic, message));
    } catch {
      console.log("Kafka retry...");
      // await new Promise((res) => setTimeout(res, 2000));
      await lastValueFrom(this.kafka.emit(topic, message));
    }
  }
}
