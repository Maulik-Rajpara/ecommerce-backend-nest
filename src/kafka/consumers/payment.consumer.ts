import { Controller, Injectable, OnModuleInit } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OrderService } from 'src/order/order.service';
import { KafkaService } from '../kafka.service';

@Controller()
export class PaymentConsumer {
  constructor(private readonly orderService: OrderService) {
      console.log('🔥 PaymentConsumer instance:', Math.random());
  }

  @EventPattern('payment-success')
async handlePaymentSuccess(@Payload() message: any) {
  console.log('📥 Kafka RAW:', message);
  let data;

  if (message?.value) {
    // Kafka raw buffer case
    data = JSON.parse(message.value.toString());
  } else {
    // Already parsed case
    data = message;
  }

  console.log('🔥 EVENT RECEIVED:', data);

  await this.orderService.handlePaymentSuccess(
    data.orderId,
    data.paymentId,
  );
}


  @EventPattern('payment.failed')
  async handlePaymentFailed(@Payload() message: any) {
      let data;

    if (message?.value) {
      // Kafka raw buffer case
      data = JSON.parse(message.value.toString());
    } else {
      // Already parsed case
      data = message;
    }

    console.log('📥 Kafka payment.failed:', data);

    await this.orderService.handlePaymentFailed(
       data.orderId,
      
    );
  }

  @EventPattern('payment.dlq')
  async handleDLQ(@Payload() message: any) {
    const data = message.value;

    console.error('💀 DLQ EVENT:', data);
  }
}