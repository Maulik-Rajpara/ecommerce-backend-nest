import { Injectable, BadRequestException } from "@nestjs/common";
import Razorpay from "razorpay";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Refund, RefundStatus } from "./entities/refund.entity";
import { Payment, PaymentStatus } from "../payment/entities/payment.entity";
import { Order, OrderStatus } from "../order/entities/order.entity";
import { ConfigService } from "@nestjs/config";
import { OrderService } from "src/order/order.service";

@Injectable()
export class RefundService {
  private razorpay: Razorpay;

  constructor(
    private configService: ConfigService,

    @InjectRepository(Refund)
    private refundRepo: Repository<Refund>,

    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,

    @InjectRepository(Order)
    private orderRepo: Repository<Order>,

    private orderService: OrderService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get("RAZORPAY_KEY_ID"),
      key_secret: this.configService.get("RAZORPAY_KEY_SECRET"),
    });
  }

  // ✅ CREATE REFUND (PRODUCTION READY)
  async createRefund(
    orderId: string,
    amount?: number,
    idempotencyKey?: string,
  ) {
    try {
      // 🧠 IDEMPOTENCY CHECK
      if (!idempotencyKey) {
        throw new BadRequestException("Idempotency key required");
      }

      const existing = await this.refundRepo.findOne({
        where: {
          idempotencyKey,
          payment: {
            order: { id: orderId },
          },
        },
        relations: ["payment", "payment.order"],
      });

      if (existing) {
        console.log("⚠️ Duplicate refund request detected");
        return {
          statusCode: 200,
          message: "Duplicate request - returning existing refund",
          data: existing,
        };
      }

      // 🔍 FETCH ORDER
      const order = await this.orderRepo.findOne({
        where: { id: orderId },
        relations: ["payments"],
      });

      if (!order) throw new BadRequestException("Order not found");

      // ✅ FIX: allow partial refund state also
      if (
        order.status !== OrderStatus.PAID &&
        order.status !== OrderStatus.PARTIALLY_REFUNDED
      ) {
        throw new BadRequestException(
          "Only paid or partially refunded orders can be refunded",
        );
      }

      // 🔥 GET LATEST SUCCESS PAYMENT
      const payment = order.payments
        .filter((p) => p.status === PaymentStatus.SUCCESS)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

      if (!payment) {
        throw new BadRequestException("No successful payment found");
      }

      // 🔢 TOTAL REFUNDED CALCULATION
      const totalRefundedResult = (await this.refundRepo
        .createQueryBuilder("refund")
        .select("COALESCE(SUM(refund.amount), 0)", "total")
        .where("refund.paymentId = :paymentId", { paymentId: payment.id })
        .getRawOne()) as { total: string | null };

      const totalRefunded = Number(totalRefundedResult.total);

      const refundAmount = amount || Number(payment.amount);

      // ❌ safety check
      if (refundAmount > Number(payment.amount)) {
        throw new BadRequestException(
          "Refund amount cannot exceed payment amount",
        );
      }

      // ❌ already fully refunded
      if (totalRefunded >= Number(payment.amount)) {
        throw new BadRequestException("Payment already fully refunded");
      }

      // ❌ exceed check
      if (totalRefunded + refundAmount > Number(payment.amount)) {
        throw new BadRequestException(
          `Refund exceeds remaining amount. Remaining: ${
            Number(payment.amount) - totalRefunded
          }`,
        );
      }

      console.log("💰 Processing refund for payment:", payment.id);

      // 🔥 RAZORPAY REFUND CALL
      const razorpayRefund = await this.razorpay.payments.refund(
        payment.razorpayPaymentId,
        {
          amount: Number(refundAmount) * 100,
        },
      );

      // 💾 SAVE REFUND
      const refund = this.refundRepo.create({
        payment,
        paymentId: payment.id,
        amount: refundAmount,
        razorpayRefundId: razorpayRefund.id,
        status: RefundStatus.SUCCESS,
        idempotencyKey,
      });

      await this.refundRepo.save(refund);

      // 🔄 UPDATE ORDER STATUS
      const newTotalRefunded = totalRefunded + refundAmount;

      if (newTotalRefunded === Number(payment.amount)) {
        await this.orderService.updateOrderState(
          order.id,
          OrderStatus.REFUNDED,
        );
      } else {
        await this.orderService.updateOrderState(
          order.id,
          OrderStatus.PARTIALLY_REFUNDED,
        );
      }

      // const user = await this.userService.findOne(order.userId);
      // this.eventEmitter.emit(EVENTS.REFUND_SUCCESS, {
      //   orderId: order.id,
      //   userId: order.userId,
      //   amount: refundAmount,
      //   email: user?.data.email,
      // });

      return {
        statusCode: 201,
        message: "Refund successful",
        data: refund,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown refund error";
      console.error("❌ Refund creation failed:", error);
      throw new BadRequestException("Refund creation failed: " + message);
    }
  }

  // ✅ GET ALL REFUNDS
  async getRefunds() {
    const refunds = await this.refundRepo.find({
      relations: ["payment"],
      order: { createdAt: "DESC" },
    });

    return {
      statusCode: 200,
      data: refunds,
    };
  }

  // ✅ GET SINGLE REFUND
  async getRefund(id: string) {
    const refund = await this.refundRepo.findOne({
      where: { id },
      relations: ["payment"],
    });

    if (!refund) throw new BadRequestException("Refund not found");

    return {
      statusCode: 200,
      data: refund,
    };
  }
}
