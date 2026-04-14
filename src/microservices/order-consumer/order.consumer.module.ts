import { Module } from "@nestjs/common";
import { PaymentConsumer } from "./payment.consumer";
import { OrderModule } from "src/order/order.module";

@Module({
  imports: [OrderModule],
  controllers: [PaymentConsumer],
})
export class OrderConsumerModule {}