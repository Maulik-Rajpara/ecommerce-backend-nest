import { KAFKA_TOPICS } from "src/kafka/kafka-topics.constants";


export interface PaymentSuccessEvent {
  razorpayOrderId: string;
  paymentId: string;
}

export interface PaymentFailedEvent {
  orderId: string;
  userId: string;
  reason: string;
}

export interface RefundSuccessEvent {
  orderId: string;
  userId: string;
}

export interface RefundFailedEvent {
  refundId: string;
  orderId: string;
  userId: string;
}

export interface OrderExpiredEvent {
  orderId: string;
  userId: string;
}

export interface KafkaEventMap {
  [KAFKA_TOPICS.PAYMENT_SUCCESS]: PaymentSuccessEvent;

  [KAFKA_TOPICS.PAYMENT_FAILED]: PaymentFailedEvent;

  [KAFKA_TOPICS.REFUND_SUCCESS]: RefundSuccessEvent;

  [KAFKA_TOPICS.REFUND_FAILED]: RefundFailedEvent;

  [KAFKA_TOPICS.ORDER_EXPIRED]: OrderExpiredEvent;
}