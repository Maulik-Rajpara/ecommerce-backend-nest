import { Injectable, BadRequestException } from '@nestjs/common';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Order } from '../order/entities/order.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderService } from '../order/order.service';

@Injectable()
export class PaymentService {
  private razorpay: Razorpay;

  constructor(
    private configService: ConfigService,

    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,


    private orderService: OrderService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get('RAZORPAY_KEY_ID'),
      key_secret: this.configService.get('RAZORPAY_KEY_SECRET'),
    });
  }

  // ✅ CREATE PAYMENT ORDER
  async createPayment(order: Order) {
    try {
      // 🔥 prevent duplicate payment
      const existingPayment = await this.paymentRepo.findOne({
        where: { order: { id: order.id } },
      });

      if ( existingPayment && existingPayment.razorpayOrderId) {
        return {
          id: existingPayment.razorpayOrderId,
        };
      }

      const options = {
        amount: Number(order.totalAmount) * 100,
        currency: 'INR',
        receipt: order.id,
        notes: {
          orderId: order.id,
        },
      };

      const razorpayOrder = await this.razorpay.orders.create(options);

      // 🔥 transaction safe save
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
    } catch (err) {
      console.error('❌ RAZORPAY ERROR:', err);
      throw new BadRequestException('Failed to create payment order');
    }
  }

  // ✅ VERIFY SIGNATURE
  verifySignature(payload: string, signature: string) {
    const secret = this.configService.get('RAZORPAY_WEBHOOK_SECRET');

    if (!signature) {
      throw new BadRequestException('Missing signature');
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return expectedSignature === signature;
  }

  // ✅ HANDLE SUCCESS
  async markPaymentSuccess(data: any) {
    const razorpayOrderId = data.order_id;
    const razorpayPaymentId = data.id;

    const payment = await this.paymentRepo.findOne({
      where: { razorpayOrderId },
      relations: ['order'],
    });

    if (!payment) throw new BadRequestException('Payment not found');
    if (!payment.order)
      throw new BadRequestException('Order relation missing');

    // ✅ idempotency
    if (payment.status === PaymentStatus.SUCCESS) {
      console.log('⚠️ Duplicate webhook ignored');
      return payment;
    }

    payment.status = PaymentStatus.SUCCESS;
    payment.razorpayPaymentId = razorpayPaymentId;

    await this.paymentRepo.save(payment);

    // 🔥 update order
    await this.orderService.handlePaymentSuccess(
      payment.order.id,
      razorpayPaymentId,
    );

    return payment;
  }

  // ✅ HANDLE FAILURE
  async markPaymentFailed(data: any) {
    const razorpayOrderId = data.order_id;

    const payment = await this.paymentRepo.findOne({
      where: { razorpayOrderId },
      relations: ['order'],
    });

    if (!payment || !payment.order) return;

    payment.status = PaymentStatus.FAILED;
    await this.paymentRepo.save(payment);

    await this.orderService.handlePaymentFailed(payment.order.id);
  }
}