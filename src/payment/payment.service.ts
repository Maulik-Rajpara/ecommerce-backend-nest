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
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Refund, RefundStatus } from "src/refund/entities/refund.entity";
import { EVENTS } from "src/common/events/events.constants";
import { KafkaService } from "src/kafka/kafka.service";

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

    @InjectQueue("payment-retry")
    private retryQueue: Queue,

    private eventEmitter: EventEmitter2,

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
    const secret = this.configService.get("RAZORPAY_WEBHOOK_SECRET");

    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    return expected === signature;
  }

  // ================= PAYMENT SUCCESS =================
  async markPaymentSuccess(data: any) {
   try{
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
      return
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

    // await this.orderService.handlePaymentSuccess(order.id, data.id);
    await this.kafkaService.emit('payment-success', {
      orderId: payment.order.id,
      userId: payment.order.userId,
      paymentId: data.id,
    });
  
  }catch (error) {
    console.error("Error marking payment success:", error);
    throw error;
   }
  }

  // ================= PAYMENT FAILED =================
  async markPaymentFailed(data: any) {
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
    if (order.status === OrderStatus.CANCELLED) return;
    if (order.retryCount >= 3) {
      // await this.orderService.handlePaymentFailed(order.id);
      console.log("⚠️ Max retries reached, marking order failed");

      return;
    }

    await this.orderService.incrementRetryCount(order.id);

    payment.status = PaymentStatus.FAILED;
    await this.paymentRepo.save(payment);

    await this.retryQueue.add(
      "retry-payment",
      { paymentId: payment.id },
      {
        jobId: payment.id, // 🔥 UNIQUE
      },
    );

    await this.kafkaService.emit('payment.failed', {
      orderId: payment.order.id,
      userId: payment.order.userId,
      paymentId: data.id,
    });
  }

  // ================= RETRY PAYMENT =================
  async retryPayment(paymentId: string) {
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
      await this.orderService.handlePaymentFailed(order.id);
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

    this.eventEmitter.emit("payment.retry.success", {
      orderId: order.id,
      userId: order.userId,
      razorpayOrderId: razorpayOrder.id,
    });
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

    const totalRefundedRaw = await this.refundRepo
      .createQueryBuilder("r")
      .select("COALESCE(SUM(r.amount),0)", "total")
      .where("r.paymentId = :id", { id: payment.id })
      .getRawOne();

    const totalRefunded = Number(totalRefundedRaw.total);

    if (totalRefunded + refundAmount > Number(payment.amount)) {
      throw new BadRequestException("Refund exceeds amount");
    }

    const razorpayRefund = await this.razorpay.payments.refund(
      payment.razorpayPaymentId,
      {
        amount: refundAmount * 100,
      },
    );

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
  async handleRefundSuccess(payload: any) {
    const data = payload.refund.entity;

    const refund = await this.refundRepo.findOne({
      where: { razorpayRefundId: data.id },
      relations: ["payment", "payment.order"],
    });

    if (!refund) return;

    // ❗ prevent overwrite
    if (refund.status === RefundStatus.SUCCESS) return;

    refund.status = RefundStatus.SUCCESS;
    await this.refundRepo.save(refund);

    const payment = refund.payment;

    const totalRaw = await this.refundRepo
      .createQueryBuilder("r")
      .select("SUM(r.amount)", "total")
      .where("r.paymentId = :id", { id: payment.id })
      .getRawOne();

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
  }

  // ================= REFUND FAILED =================
  async handleRefundFailed(payload: any) {
    const data = payload.refund.entity;

    const refund = await this.refundRepo.findOne({
      where: { razorpayRefundId: data.id },
    });

    if (!refund) return;

    // ❗ don't overwrite success
    if (refund.status === RefundStatus.SUCCESS) return;

    refund.status = RefundStatus.FAILED;
    await this.refundRepo.save(refund);
  }
}
