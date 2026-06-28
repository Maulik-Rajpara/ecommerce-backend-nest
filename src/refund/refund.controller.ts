import {
  Controller,
  Post,
  Param,
  Body,
  Get,
  Headers,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import { RefundService } from "./refund.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("admin/refunds")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  // ✅ CREATE REFUND
  @Post(":orderId")
  createRefund(
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @Body("amount") amount?: number,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.refundService.createRefund(orderId, amount, idempotencyKey);
  }

  // ✅ GET ALL
  @Get()
  getRefunds(
    @Query("page") page = 1,
    @Query("limit") limit = 20,
  ) {
    return this.refundService.getRefunds(page, limit);
  }

  // ✅ GET ONE
  @Get(":id")
  getRefund(@Param("id", ParseUUIDPipe) id: string) {
    return this.refundService.getRefund(id);
  }
}
