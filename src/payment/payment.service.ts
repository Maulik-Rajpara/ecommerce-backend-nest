import { Injectable, BadRequestException } from "@nestjs/common";
import Razorpay from "razorpay";
import * as crypto from "crypto";
import { ConfigService } from "@nestjs/config";
import { Order, OrderStatus } from "../order/entities/order.entity";
import { Payment, PaymentStatus } from "./entities/payment.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OrderService } from "../order/order.service";
import { Queue } from "bullmq";
import { InjectQueue } from "@nestjs/bullmq";
import { Refund, RefundStatus } from "src/refund/entities/refund.entity";
import { KafkaService } from "src/kafka/kafka.service";
import { KAFKA_TOPICS } from "src/kafka/kafka-topics.constants";
import { JOBS, QUEUES, RETRY_OPTIONS } from "src/async/async.constants";

interface RazorpayPaymentEvent {
  id: string;
  order_id: string;
}

interface RazorpayRefundPayload {
  refund?: {
    entity?: {
      id?: string;
    };
  };
}

interface CheckoutSignatureInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

@Injectable()
export class PaymentService {
  private razorpay: Razorpay;

  constructor(
    private configService: ConfigService,

    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,

    @InjectRepository(Refund)
    private refundRepo: Repository<Refund>,

    private orderService: OrderService,

    @InjectQueue(QUEUES.PAYMENT_RETRY)
    private retryQueue: Queue,

    @InjectQueue(QUEUES.REFUND_RETRY)
    private refundRetryQueue: Queue,

    private kafkaService: KafkaService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get("RAZORPAY_KEY_ID"),
      key_secret: this.configService.get("RAZORPAY_KEY_SECRET"),
    });
  }

  // ================= CREATE PAYMENT =================
  async createPayment(order: Order) {
    const existing = await this.paymentRepo.findOne({
      where: { order: { id: order.id }, status: PaymentStatus.PENDING },
    });

    if (existing) {
      return { id: existing.razorpayOrderId };
    }

    const razorpayOrder = await this.razorpay.orders.create({
      amount: Number(order.totalAmount) * 100,
      currency: "INR",
      receipt: order.id,
    });

    await this.paymentRepo.manager.transaction(async (manager) => {
      const payment = manager.create(Payment, {
        order,
        razorpayOrderId: razorpayOrder.id,
        amount: order.totalAmount,
      });

      await manager.save(payment);

      order.razorpayOrderId = razorpayOrder.id;
      await manager.save(order);
    });

    return razorpayOrder;
  }

  // ================= VERIFY SIGNATURE =================
  verifySignature(payload: string, signature: string) {
    const secret = this.configService.get<string>("RAZORPAY_WEBHOOK_SECRET");
    if (!secret) {
      throw new BadRequestException("Webhook secret is not configured");
    }
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return expected === signature;
  }

  // ================= VERIFY CHECKOUT SIGNATURE =================
  verifyCheckoutSignature(data: CheckoutSignatureInput) {
    const secret = this.configService.get("RAZORPAY_KEY_SECRET");

    const body = `${data.orderId}|${data.paymentId}`;

    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    return expected === data.signature;
  }

  // ================= SAVE PAYMENT DETAILS =================
  async savePaymentDetails(data: {
    orderId: string;
    paymentId: string;
    signature: string;
  }) {
    const payment = await this.paymentRepo.findOne({
      where: { razorpayOrderId: data.paymentId },
    });

    if (payment) {
      payment.razorpaySignature = data.signature;
      await this.paymentRepo.save(payment);
      return;
    }
   
    const orderPayment = await this.paymentRepo.findOne({
      where: { razorpayOrderId: data.orderId },
    });

    if (!orderPayment) return;

    orderPayment.razorpayPaymentId = data.paymentId;
    orderPayment.razorpaySignature = data.signature;

    await this.paymentRepo.save(orderPayment);
  }

  // ================= PAYMENT SUCCESS =================
  async markPaymentSuccess(data?: RazorpayPaymentEvent) {
    if (!data) return;

    try {
      const payment = await this.paymentRepo.findOne({
        where: { razorpayOrderId: data.order_id },
        relations: ["order"],
      });

      if (!payment || !payment.order) return;

      const order = payment.order;

      // ❗ already paid
      if (order.status === OrderStatus.PAID) {
        console.log("⚠️ Order already paid");
        // throw new BadRequestException("Order already paid");

        return;
      }

      // ❗ invalid state
      if (order.status !== OrderStatus.PENDING) {
        console.log("⚠️ Order not pending, ignoring success");
        // throw new BadRequestException("Order not pending, ignoring success");
        return;
      }

      // ❗ duplicate webhook
      if (payment.status === PaymentStatus.SUCCESS) {
        console.log("⚠️ Duplicate payment success ignored");

        //throw new BadRequestException("Duplicate payment success ignored");
        return;
      }

      payment.status = PaymentStatus.SUCCESS;
      payment.razorpayPaymentId = data.id;

      await this.paymentRepo.save(payment);

      await this.kafkaService.emit(KAFKA_TOPICS.PAYMENT_SUCCESS, {
        razorpayOrderId: data.order_id,
        paymentId: data.id,
      });
    } catch (error) {
      console.error("Error marking payment success:", error);
      throw error;
    }
  }

  // ================= PAYMENT FAILED =================
  async markPaymentFailed(data?: RazorpayPaymentEvent) {
    if (!data) return;

    const payment = await this.paymentRepo.findOne({
      where: { razorpayOrderId: data.order_id },
      relations: ["order"],
    });

    if (!payment || !payment.order) return;
    if (payment.status === PaymentStatus.FAILED) {
      console.log("⚠️ Duplicate failure ignored");
      return;
    }

    const order = payment.order;
    if (order.status !== OrderStatus.PENDING) return;

    payment.status = PaymentStatus.FAILED;
    await this.paymentRepo.save(payment);

    const nextRetryCount = order.retryCount + 1;
    await this.orderService.incrementRetryCount(order.id);

    if (order.expiresAt && order.expiresAt < new Date()) {
      await this.orderService.handlePaymentFailed(data.order_id);
      await this.kafkaService.emit(KAFKA_TOPICS.PAYMENT_FAILED, {
        orderId: order.id,
        userId: order.userId,
        reason: "order-expired",
      });
      return;
    }

    if (nextRetryCount >= 3) {
      await this.orderService.handlePaymentFailed(data.order_id);
      await this.kafkaService.emit(KAFKA_TOPICS.PAYMENT_FAILED, {
        orderId: order.id,
        userId: order.userId,
        reason: "retry-limit-reached",
      });
      return;
    }

    await this.retryQueue.add(
      JOBS.PAYMENT_RETRY,
      { paymentId: payment.id },
      {
        jobId: payment.id, // 🔥 UNIQUE
      },
    );
  }

  // ================= RETRY PAYMENT =================
  async retryPayment(paymentId: string) {
    try {
      const payment = await this.paymentRepo.findOne({
        where: { id: paymentId },
        relations: ["order"],
      });

      if (!payment || !payment.order) return;

      const order = await this.orderService.findById(payment.order.id);

      // ❗ already paid
      if (order.status === OrderStatus.PAID) return;

      // ❗ expired
      if (order.expiresAt && order.expiresAt < new Date()) {
        await this.orderService.handlePaymentFailed(order.razorpayOrderId);
        await this.kafkaService.emit(KAFKA_TOPICS.PAYMENT_FAILED, {
          orderId: order.id,
          userId: order.userId,
          reason: "order-expired-during-retry",
        });
        return;
      }

      if (order.status !== OrderStatus.PENDING) return;

      const razorpayOrder = await this.razorpay.orders.create({
        amount: Number(order.totalAmount) * 100,
        currency: "INR",
        receipt: order.id,
      });

      const newPayment = this.paymentRepo.create({
        order,
        razorpayOrderId: razorpayOrder.id,
        amount: order.totalAmount,
        status: PaymentStatus.PENDING,
      });

      await this.paymentRepo.save(newPayment);

      await this.orderService.updateRazorpayOrderId(order.id, razorpayOrder.id);
      console.log("success in retryPayment:", razorpayOrder);
      return razorpayOrder;
    } catch (err) {
      console.error("Error in retryPayment:", err);
      throw err;
    }
  }

  // ================= REFUND =================
  async refundPayment(orderId: string, amount?: number) {
    const payment = await this.paymentRepo.findOne({
      where: { order: { id: orderId }, status: PaymentStatus.SUCCESS },
      relations: ["order"],
    });

    if (!payment) {
      throw new BadRequestException("Payment not found");
    }

    if (!payment.razorpayPaymentId) {
      throw new BadRequestException("Invalid payment");
    }

    const refundAmount = amount || Number(payment.amount);

    if (!refundAmount || refundAmount <= 0) {
      throw new BadRequestException("Invalid refund amount");
    }

    const totalRefundedRaw = (await this.refundRepo
      .createQueryBuilder("r")
      .select("COALESCE(SUM(r.amount),0)", "total")
      .where("r.paymentId = :id", { id: payment.id })
      .getRawOne()) as { total: string | null };

    const totalRefunded = Number(totalRefundedRaw.total);

    if (totalRefunded + refundAmount > Number(payment.amount)) {
      throw new BadRequestException("Refund exceeds amount");
    }

    const razorpayRefund = (await this.razorpay.payments.refund(
      payment.razorpayPaymentId,
      {
        amount: refundAmount * 100,
      },
    )) as { id: string };

    const refund = this.refundRepo.create({
      payment,
      paymentId: payment.id,
      amount: refundAmount,
      razorpayRefundId: razorpayRefund.id,
      status: RefundStatus.INITIATED,
    });

    await this.refundRepo.save(refund);

    return refund;
  }

  // ================= REFUND SUCCESS =================
  async handleRefundSuccess(payload?: RazorpayRefundPayload) {
    const refundId = payload?.refund?.entity?.id;
    if (!refundId) return;

    const refund = await this.refundRepo.findOne({
      where: { razorpayRefundId: refundId },
      relations: ["payment", "payment.order"],
    });

    if (!refund) return;
    if (!refund.payment?.order) return;

    // ❗ prevent overwrite
    if (refund.status === RefundStatus.SUCCESS) return;
    console.log("Handling refund success for refundId:", refundId);

    refund.status = RefundStatus.SUCCESS;
    await this.refundRepo.save(refund);

    const payment = refund.payment;

    const totalRaw = (await this.refundRepo
      .createQueryBuilder("r")
      .select("SUM(r.amount)", "total")
      .where("r.paymentId = :id", { id: payment.id })
      .getRawOne()) as { total: string | null };

    const total = Number(totalRaw.total);

    const order = payment.order;

    if (total === Number(payment.amount)) {
      await this.orderService.updateOrderState(order.id, OrderStatus.REFUNDED);
    } else {
      await this.orderService.updateOrderState(
        order.id,
        OrderStatus.PARTIALLY_REFUNDED,
      );
    }
    // console.log("kafka", total);

    await this.kafkaService
      .emit(KAFKA_TOPICS.REFUND_SUCCESS, {
        orderId: order.id,
        userId: order.userId,
      })
      .catch((err) => {
        console.error("Error emitting refund-success event:", err);
      })
      .then(() => {
        // console.log("Emitted refund-success event for orderId:", order.id);
      });
  }

  // ================= REFUND FAILED =================
  async handleRefundFailed(payload?: RazorpayRefundPayload) {
    const refundId = payload?.refund?.entity?.id;
    if (!refundId) return;

    const refund = await this.refundRepo.findOne({
      where: { razorpayRefundId: refundId },
      relations: ["payment", "payment.order"],
    });

    if (!refund) return;

    if (refund.status === RefundStatus.SUCCESS) return;

    // 🔁 retry limit
    if (refund.retryCount >= 3) {
      console.log("❌ Max refund retry reached");

      refund.status = RefundStatus.FAILED;
      await this.refundRepo.save(refund);

      await this.kafkaService.emit(KAFKA_TOPICS.REFUND_FAILED, {
        refundId: refund.id,
        orderId: refund.payment.order.id,
        userId: refund.payment.order.userId,
      });

      return;
    }

    // 🔥 update retry count
    refund.retryCount += 1;
    refund.status = RefundStatus.FAILED;

    await this.refundRepo.save(refund);

    // 🔁 PUSH TO QUEUE
    await this.refundRetryQueue.add(
      JOBS.REFUND_RETRY,
      { refundId: refund.id },
      RETRY_OPTIONS.REFUND_RETRY,
    );

    // for user notification (optional, since refund retry is automatic)
    await this.kafkaService.emit(KAFKA_TOPICS.REFUND_FAILED, {
      refundId: refund.id,
      orderId: refund.payment.order.id,
      userId: refund.payment.order.userId,
    });
  }

  async retryRefund(refundId: string) {
    const refund = await this.refundRepo.findOne({
      where: { id: refundId },
      relations: ["payment"],
    });

    if (!refund) return;

    if (refund.status === RefundStatus.SUCCESS) return;

    const payment = refund.payment;

    if (!payment?.razorpayPaymentId) return;

    try {
      const razorpayRefund = await this.razorpay.payments.refund(
        payment.razorpayPaymentId,
        {
          amount: Number(refund.amount) * 100,
        },
      );

      // 🔄 update refund
      refund.razorpayRefundId = razorpayRefund.id;
      refund.status = RefundStatus.INITIATED;

      await this.refundRepo.save(refund);

      console.log("✅ Refund retry initiated");
    } catch {
      console.error("❌ Retry failed again");
    }
  }

  /// Retry From Frontend ///
  async retryFromFrontend(orderId: string) {
    try {
      const order = await this.orderService.findById(orderId);

      if (!order) throw new BadRequestException("Order not found");

      // ❗ already paid
      if (order.status === OrderStatus.PAID) {
        throw new BadRequestException("Already paid");
      }

      // ❗ expired
      if (order.expiresAt && order.expiresAt < new Date()) {
        throw new BadRequestException("Order expired");
      }

      // 🔁 increment retry
      await this.orderService.incrementRetryCount(order.id);

      if (order.retryCount >= 3) {
        await this.orderService.updateOrderState(
          order.id,
          OrderStatus.CANCELLED,
        );

        return {
          message: "Max retries reached. Order cancelled",
        };
      }

      // 🔥 CREATE NEW RAZORPAY ORDER
      const razorpayOrder = await this.razorpay.orders.create({
        amount: Number(order.totalAmount) * 100,
        currency: "INR",
        receipt: order.id,
      });

      await this.orderService.updateRazorpayOrderId(order.id, razorpayOrder.id);

      return razorpayOrder;
    } catch (err) {
      console.error("Error in retryFromFrontend:", err);
      throw err;
    }
  }
}
