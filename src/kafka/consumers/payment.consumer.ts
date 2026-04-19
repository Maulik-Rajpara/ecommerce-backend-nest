import { Controller } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { OrderService } from "src/order/order.service";
import { KAFKA_TOPICS } from "../kafka-topics.constants";
import { KafkaService } from "../kafka.service";

interface PaymentSuccessEvent {
  razorpayOrderId?: string;
  orderId?: string;
  paymentId: string;
}

interface KafkaEnvelope {
  value?: Buffer;
}

interface PaymentRetryEnvelope extends Record<string, unknown> {
  payload?: PaymentSuccessEvent;
  sourceTopic?: string;
  attempt?: number;
  error?: string;
  failedAt?: string;
}

@Controller()
export class PaymentConsumer {
  constructor(
    private readonly orderService: OrderService,
    private readonly kafkaService: KafkaService,
  ) {
    console.log("PaymentConsumer initialized");
  }

  private decodeKafkaMessage(message: unknown): unknown {
    if (
      typeof message === "object" &&
      message !== null &&
      "value" in message &&
      message.value instanceof Buffer
    ) {
      return JSON.parse(message.value.toString()) as unknown;
    }

    return message;
  }

  private extractPaymentPayload(decoded: unknown): PaymentSuccessEvent | null {
    if (!decoded || typeof decoded !== "object") {
      return null;
    }

    const data = decoded as PaymentSuccessEvent & PaymentRetryEnvelope;
    if (data.payload && typeof data.payload === "object") {
      return data.payload;
    }

    if (typeof data.paymentId === "string") {
      return data;
    }

    return null;
  }

  private async processPaymentSuccess(message: unknown, sourceTopic: string, attempt: number) {
    const decoded = this.decodeKafkaMessage(message);
    const payload = this.extractPaymentPayload(decoded);
    if (!payload) {
      return;
    }

    const razorpayOrderId = payload.razorpayOrderId ?? payload.orderId;
    if (!razorpayOrderId) return;

    try {
      await this.orderService.handlePaymentSuccess(razorpayOrderId, payload.paymentId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const retryEnvelope: PaymentRetryEnvelope = {
        sourceTopic,
        attempt,
        error: errorMessage,
        failedAt: new Date().toISOString(),
        payload,
      };

      if (attempt === 0) {
        await this.kafkaService.emit(KAFKA_TOPICS.PAYMENT_SUCCESS_RETRY_1, retryEnvelope);
        return;
      }

      if (attempt === 1) {
        await this.kafkaService.emit(KAFKA_TOPICS.PAYMENT_SUCCESS_RETRY_2, retryEnvelope);
        return;
      }

      await this.kafkaService.emit(KAFKA_TOPICS.PAYMENT_SUCCESS_DLQ, retryEnvelope);
      // keep old DLQ topic alive for backward compatibility dashboards/alerts.
      await this.kafkaService.emit(KAFKA_TOPICS.PAYMENT_DLQ, retryEnvelope);
    }
  }

  @EventPattern(KAFKA_TOPICS.PAYMENT_SUCCESS)
  async handlePaymentSuccess(@Payload() message: unknown) {
    await this.processPaymentSuccess(message, KAFKA_TOPICS.PAYMENT_SUCCESS, 0);
  }

  @EventPattern(KAFKA_TOPICS.PAYMENT_SUCCESS_RETRY_1)
  async handlePaymentSuccessRetry1(@Payload() message: unknown) {
    await this.processPaymentSuccess(message, KAFKA_TOPICS.PAYMENT_SUCCESS_RETRY_1, 1);
  }

  @EventPattern(KAFKA_TOPICS.PAYMENT_SUCCESS_RETRY_2)
  async handlePaymentSuccessRetry2(@Payload() message: unknown) {
    await this.processPaymentSuccess(message, KAFKA_TOPICS.PAYMENT_SUCCESS_RETRY_2, 2);
  }

  @EventPattern(KAFKA_TOPICS.PAYMENT_SUCCESS_DLQ)
  handlePaymentSuccessDLQ(@Payload() message: KafkaEnvelope) {
    const data = message.value?.toString();
    console.error("💀 PAYMENT SUCCESS DLQ EVENT:", data);
  }

  @EventPattern(KAFKA_TOPICS.PAYMENT_DLQ)
  handleLegacyDLQ(@Payload() message: KafkaEnvelope) {
    const data = message.value?.toString();
    console.error("💀 LEGACY PAYMENT DLQ EVENT:", data);
  }
}
