import { PaymentModule } from "src/payment/payment.module";
import { PaymentWebhookController } from "./webhook.controller";

import { Module } from "@nestjs/common";
import { EventStoreModule } from "src/event-store/event-store.module";

@Module({
  imports: [PaymentModule, EventStoreModule],
  controllers: [PaymentWebhookController],
})
export class WebhookModule {}
