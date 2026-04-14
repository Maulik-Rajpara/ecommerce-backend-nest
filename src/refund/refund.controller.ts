import {
  Controller,
  Post,
  Param,
  Body,
  Get,Headers
} from '@nestjs/common';
import { RefundService } from './refund.service';

@Controller('admin/refunds')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  // ✅ CREATE REFUND
  @Post(':orderId')
  createRefund(
    @Param('orderId') orderId: string,
    @Body('amount') amount?: number,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.refundService.createRefund(orderId, amount, idempotencyKey);
  }

  // ✅ GET ALL
  @Get()
  getRefunds() {
    return this.refundService.getRefunds();
  }

  // ✅ GET ONE
  @Get(':id')
  getRefund(@Param('id') id: string) {
    return this.refundService.getRefund(id);
  }
}