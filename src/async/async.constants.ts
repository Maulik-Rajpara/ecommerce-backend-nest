import { JobsOptions } from "bullmq";

export const QUEUES = {
  EMAIL: "email",
  ORDER_EXPIRY: "order-expiry",
  PAYMENT_RETRY: "payment-retry",
  REFUND_RETRY: "refund-retry",
} as const;

export const JOBS = {
  EMAIL_SEND: "send-email",
  EMAIL_RESET_PASSWORD: "send-reset-email",
  ORDER_EXPIRE: "order-expiry",
  PAYMENT_RETRY: "retry-payment",
  REFUND_RETRY: "refund-retry",
} as const;

export const CRON_SCHEDULES = {
  ORDER_EXPIRY_SWEEP: "0 */15 * * * *",
} as const;

export const RETRY_OPTIONS: Record<string, JobsOptions> = {
  EMAIL: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
  REFUND_RETRY: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
};
