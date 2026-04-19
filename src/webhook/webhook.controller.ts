import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
} from "@nestjs/common";
import type { Request } from "express";
import { PaymentService } from "src/payment/payment.service";
import { EventStoreService } from "src/event-store/event-store.service";

@Controller("webhook")
export class PaymentWebhookController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly eventStoreService: EventStoreService,
  ) {}

  @Post("razorpay")
  async handleWebhook(
    @Req() req: Request,
    @Headers("x-razorpay-signature") signature?: string,
    @Headers("x-razorpay-event-id") webhookEventId?: string,
  ) {
    try {
      if (!signature) {
        throw new BadRequestException("Missing webhook signature");
      }

      const rawBody = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(JSON.stringify(req.body ?? {}));
      const payload = rawBody.toString("utf8");

      if (!this.paymentService.verifySignature(payload, signature)) {
        throw new BadRequestException("Invalid webhook signature");
      }

      const parsedBody = JSON.parse(payload) as {
        event?: string;
        payload?: {
          payment?: { entity?: { id?: string } };
          refund?: { entity?: { id?: string } };
        };
      };

      const event = parsedBody?.event;
      const aggregateId =
        parsedBody?.payload?.payment?.entity?.id ??
        parsedBody?.payload?.refund?.entity?.id;

      if (!event || !aggregateId) {
        throw new BadRequestException("Invalid webhook payload");
      }

      const key = webhookEventId ?? `${event}_${aggregateId}`;

      await this.eventStoreService.createEvent({
        type: event,
        aggregateId,
        payload: parsedBody,
        idempotencyKey: key,
      });
      return { acknowledged: true };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Webhook processing failed";
      throw new BadRequestException(message);
    }
  }
}
