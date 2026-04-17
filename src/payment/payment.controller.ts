import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { OrderService } from "../order/order.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AuthenticatedRequest } from "../common/interfaces/authenticated-request.interface";

// 🔥 PROTECT ALL ROUTES
@Controller("payments")
export class PaymentController {
  constructor(
    private paymentService: PaymentService,
    private orderService: OrderService,
  ) {}

  // ================= CREATE PAYMENT =================
  @UseGuards(JwtAuthGuard)
  @Post("create")
  async createPayment(@Req() req: AuthenticatedRequest) {
    try {
      const userId = req.user.userId;

      // 1️⃣ create or get existing order
      const orderRes = await this.orderService.createOrder(userId);
      const order = orderRes.data;

      // 🔥 prevent duplicate Razorpay order creation
      if (order.razorpayOrderId) {
        return {
          statusCode: 200,
          statusMessage: "Payment already initiated",
          data: {
            order,
            payment: {
              id: order.razorpayOrderId,
            },
          },
        };
      }

      // 2️⃣ create Razorpay order
      const razorpayOrder = await this.paymentService.createPayment(order);

      return {
        statusCode: 201,
        statusMessage: "Payment order created",
        data: {
          order,
          payment: razorpayOrder,
        },
      };
    } catch (err) {
      console.error("❌ SERVICE ERROR:", err);
      throw err;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post("verify")
  async verifyPayment(@Body() body: any) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        body;

      const isValid = this.paymentService.verifyCheckoutSignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });

      if (!isValid) {
        throw new BadRequestException("Invalid signature");
      }

      // 🔥 SAVE DATA
      await this.paymentService.savePaymentDetails({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });

      return {
        statusCode: 200,
        statusMessage: "Signature verified and payment details saved",
        data: null,
      };
    } catch (err) {
      console.error("❌ verifyPayment ERROR:", err);
      throw err;
    }
  }

  // ================= WEBHOOK =================
  // @Post("webhook")
  // async handleWebhook(
  //   @Req() req: any,
  //   @Headers("x-razorpay-signature") signature: string,
  // ) {
  //   // ⚠️ IMPORTANT: req.body must be RAW (Buffer)
  //   try {

  //     const payload = Buffer.isBuffer(req.body)
  //       ? req.body.toString()
  //       : JSON.stringify(req.body);

  //     console.log("🔍 Webhook payload:", req.body);
  //     const isValid = this.paymentService.verifySignature(
  //       payload,
  //       signature,
  //     );
  //     if (!isValid && process.env.NODE_ENV === 'production') {
  //       throw new BadRequestException('Invalid signature');
  //     }

  //     const event = JSON.parse(payload);

  //     // ✅ handle payment success
  //     if (event.event === "payment.captured") {
  //       const paymentEntity = event.payload.payment.entity;
  //       console.log("✅ Payment captured:", paymentEntity);
  //       await this.paymentService.markPaymentSuccess(paymentEntity,);
  //     }

  //     // (optional) handle failure
  //     if (event.event === "payment.failed") {
  //       const paymentEntity = event.payload.payment.entity;

  //       // you can implement failure logic later
  //        await this.paymentService.markPaymentFailed(paymentEntity);
  //     }

  //     return {
  //       status: "ok",
  //     };
  //   } catch (err) {
  //     console.error("❌ WEBHOOK ERROR:", err);
  //     throw new BadRequestException("Invalid webhook");
  //   }
  // }
}
