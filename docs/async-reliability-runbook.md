# Async Reliability Runbook

This service uses mixed async components (Kafka, BullMQ, cron). This runbook defines the production failure path and operational checks.

## Payment Event Retry Chain

- Main topic: `payment-success`
- Retry topic 1: `payment-success.retry.1`
- Retry topic 2: `payment-success.retry.2`
- Final DLQ topic: `payment-success.dlq`
- Legacy DLQ topic (backward compatibility): `payment.dlq`

Processing behavior in `PaymentConsumer`:

1. Consume from main topic and process order payment success.
2. On error, publish same payload to retry topic 1 with error metadata.
3. If retry 1 fails, publish to retry topic 2.
4. If retry 2 fails, publish to final DLQ and legacy DLQ.

## Queue Standards

- Queue names, job names, cron schedules, and retry options are centralized in `src/async/async.constants.ts`.
- Email jobs use consistent retry policy (`attempts=3`, exponential backoff).
- Refund retry uses centralized retry options.

## Required Dashboards / Alerts

- Kafka consumer lag for:
  - `payment-success`
  - `payment-success.retry.1`
  - `payment-success.retry.2`
  - `payment-success.dlq`
- DLQ message count alert:
  - Alert when `payment-success.dlq` receives messages in 5-minute window.
- BullMQ queue depth alert:
  - `payment-retry`, `refund-retry`, `email`, `order-expiry`.
- Event store dead events:
  - Alert when `EventStore.status = DEAD` is greater than 0.

## Manual Recovery (Payment Success DLQ)

1. Inspect payload from `payment-success.dlq`.
2. Validate referenced order and payment IDs in DB.
3. If payload is valid and issue is transient, republish payload to `payment-success`.
4. If payload is invalid, mark incident and keep message in DLQ for audit.

## Deployment Checklist

- Confirm Kafka topics exist in broker:
  - `payment-success`
  - `payment-success.retry.1`
  - `payment-success.retry.2`
  - `payment-success.dlq`
  - `payment.dlq`
- Confirm all BullMQ processors are running:
  - email
  - order expiry
  - payment retry
  - refund retry
- Confirm cron jobs are enabled in deployed app instances.
