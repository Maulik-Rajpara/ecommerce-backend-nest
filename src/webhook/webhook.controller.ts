import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import express from "express";
import { PaymentService } from "src/payment/payment.service";
import { Repository } from "typeorm";
import { WebhookEvent } from "./entities/webhook.entities";
import { EventStoreService } from "src/event-store/event-store.service";

@Controller("webhook")
export class PaymentWebhookController {
  constructor(private eventStoreService: EventStoreService) {}

  // PaymentWebhookController

  @Post("razorpay")
  async handleWebhook(@Req() req: Request) {
    try {
      const rawBody = (req as any).rawBody || req.body;

      console.log("📡 Webhook received:", rawBody?.event);

      const parsedBody =
        typeof rawBody === "string"
          ? JSON.parse(rawBody)
          : Buffer.isBuffer(rawBody)
            ? JSON.parse(rawBody.toString())
            : rawBody;

      const event = parsedBody?.event;
      const paymentId = parsedBody?.payload?.payment?.entity?.id || "unknown";

      const key = `${event}_${paymentId}`;

      await this.eventStoreService.createEvent({
        type: event,
        aggregateId: paymentId,
        payload: parsedBody,
        idempotencyKey: key,
      });
      console.log("📡 Webhook received:", key);
      return { status: "ok" };
    } catch (err) {
      console.error("Error processing webhook:", err);
      throw new BadRequestException("Webhook failed ",err.message);
    }
  }

  // @Post('razorpay')
  // async handleWebhook(
  //   @Req() req: express.Request,
  //   @Headers('x-razorpay-signature') signature: string,
  // ) {
  //   const payload = JSON.stringify(req.body);

  //   const isValid = this.paymentService.verifySignature(
  //     payload,
  //     signature,
  //   );

  //   if (!isValid && process.env.NODE_ENV === 'production') {
  //       throw new BadRequestException('Invalid signature');
  //    }

  //   const event = req.body.event;

  //   console.log('📡 Webhook received:', event);

  //   const eventId = req.body?.event + "_" + req.body?.payload?.payment?.entity?.id;

  //   const exists = await this.webhookRepo.findOne({
  //     where: { eventId },
  //   });

  //   if (exists) {
  //     console.log("⚠️ Duplicate webhook skipped");
  //     return { status: "ok" };
  //   }

  //   await this.webhookRepo.save({ eventId, eventType: event });

  //   switch (event) {
  //     case 'refund.processed':
  //       await this.paymentService.handleRefundSuccess(req.body.payload);
  //       break;

  //     case 'refund.failed':
  //       await this.paymentService.handleRefundFailed(req.body.payload);
  //       break;

  //     default:
  //       console.log('⚠️ Unhandled webhook:', event);
  //   }

  //   return { status: 'ok' };
  // }
}
