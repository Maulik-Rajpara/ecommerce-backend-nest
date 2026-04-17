import { Controller } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { OrderService } from "src/order/order.service";

interface PaymentSuccessEvent {
  razorpayOrderId?: string;
  orderId?: string;
  paymentId: string;
}

interface KafkaPayloadEnvelope {
  value?: Buffer;
}

@Controller()
export class PaymentConsumer {
  
  constructor(private readonly orderService: OrderService) {
    console.log("PaymentConsumer initialized");
  }

  private parsePayload(message: unknown): PaymentSuccessEvent {
    if (
      typeof message === "object" &&
      message !== null &&
      "value" in message &&
      message.value instanceof Buffer
    ) {
      return JSON.parse(message.value.toString()) as PaymentSuccessEvent;
    }

    return message as PaymentSuccessEvent;
  }

  @EventPattern("payment-success")
  async handlePaymentSuccess(@Payload() message: unknown) {
    const data = this.parsePayload(message);
    const razorpayOrderId = data.razorpayOrderId ?? data.orderId;
    if (!razorpayOrderId) return;

    await this.orderService.handlePaymentSuccess(
      razorpayOrderId,
      data.paymentId,
    );
  }

  @EventPattern("payment.dlq")
  handleDLQ(@Payload() message: KafkaPayloadEnvelope) {
    const data = message.value?.toString();

    console.error("💀 DLQ EVENT:", data);
  }
}
