import {
  Controller,
  Post,
  Headers,
  Req,
  BadRequestException,
  UseGuards,
} from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { OrderService } from "../order/order.service";
import { AuthGuard } from "@nestjs/passport";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

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
  async createPayment(@Req() req: any) {
    try {
      const userId = req.user.id;

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

  // ================= WEBHOOK =================
  @Post("webhook")
  async handleWebhook(
    @Req() req: any,
    @Headers("x-razorpay-signature") signature: string,
  ) {
    // ⚠️ IMPORTANT: req.body must be RAW (Buffer)
    try {

      const payload = Buffer.isBuffer(req.body)
        ? req.body.toString()
        : JSON.stringify(req.body);
     
      console.log("🔍 Webhook payload:", req.body);
      const isValid = this.paymentService.verifySignature(
        payload,
        signature,
      );
      if (!isValid && process.env.NODE_ENV === 'production') {
        throw new BadRequestException('Invalid signature');
      }

     

      const event = JSON.parse(payload);

      // ✅ handle payment success
      if (event.event === "payment.captured") {
        const paymentEntity = event.payload.payment.entity;

        await this.paymentService.markPaymentSuccess(paymentEntity,);
      }

      // (optional) handle failure
      if (event.event === "payment.failed") {
        const paymentEntity = event.payload.payment.entity;

        // you can implement failure logic later
         await this.paymentService.markPaymentFailed(paymentEntity);
      }

      return {
        status: "ok",
      };
    } catch (err) {
      console.error("❌ WEBHOOK ERROR:", err);
      throw new BadRequestException("Invalid webhook");
    }
  }
}
