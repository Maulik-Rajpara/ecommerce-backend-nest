import { Module } from "@nestjs/common";
import { KafkaModule } from "./kafka.module";
import { KafkaService } from "./kafka.service";

@Module({
  imports: [KafkaModule],
  providers: [KafkaService],
  exports: [KafkaModule],
})
export class KafkaProducerModule {}
