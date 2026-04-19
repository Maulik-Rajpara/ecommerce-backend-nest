export const KAFKA_TOPICS = {
  PAYMENT_SUCCESS: "payment-success",
  PAYMENT_SUCCESS_RETRY_1: "payment-success.retry.1",
  PAYMENT_SUCCESS_RETRY_2: "payment-success.retry.2",
  PAYMENT_SUCCESS_DLQ: "payment-success.dlq",
  PAYMENT_FAILED: "payment-failed",
  PAYMENT_DLQ: "payment.dlq",
  ORDER_EXPIRED: "order-expired",
  REFUND_SUCCESS: "refund-success",
  REFUND_FAILED: "refund-failed",
} as const;
