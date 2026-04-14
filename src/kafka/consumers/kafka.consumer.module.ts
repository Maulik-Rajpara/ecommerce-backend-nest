import { Module } from "@nestjs/common";
import { PaymentConsumer } from "./payment.consumer";
import { OrderModule } from "src/order/order.module";
import { KafkaModule } from "../kafka.module";

@Module({
  imports: [KafkaModule, OrderModule],
  controllers: [PaymentConsumer], // ✅ FIX
})
export class KafkaConsumerModule {}
