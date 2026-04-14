import { PaymentModule } from "src/payment/payment.module";
import { PaymentWebhookController } from "./webhook.controller";

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WebhookEvent } from "./entities/webhook.entities";
import { EventStoreModule } from "src/event-store/event-store.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([]), // ❌ remove WebhookEvent if not needed
    PaymentModule,
    EventStoreModule,
  ],
  controllers: [PaymentWebhookController],
 
})
export class WebhookModule {}