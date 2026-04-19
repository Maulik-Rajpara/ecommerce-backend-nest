import { Module } from "@nestjs/common";
import { PaymentConsumer } from "./payment.consumer";
import { OrderModule } from "src/order/order.module";
import { KafkaModule } from "../kafka.module";
import { RefundConsumer } from "./refund.consumer";
import { OrderConsumer } from "./order.consumer";
import { NotificationModule } from "src/notification/notification.module";
import { UsersModule } from "src/users/users.module";

@Module({
  imports: [KafkaModule, OrderModule, NotificationModule, UsersModule],
  controllers: [PaymentConsumer, RefundConsumer, OrderConsumer],
})
export class KafkaConsumerModule {}
