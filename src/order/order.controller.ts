import {
  Controller,
  Post,
  Get,
  Req,
  Param,
  UseGuards,
  Patch,
  Query,
} from '@nestjs/common';

import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { OrderStatus } from './entities/order.entity';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ================= USER =================

  @UseGuards(JwtAuthGuard)
  @Post()
  createOrder(@Req() req) {
    return this.orderService.createOrder(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getMyOrders(@Req() req) {
    return this.orderService.getMyOrders(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOrder(@Req() req, @Param('id') id: string) {
    return this.orderService.getOrder(req.user.userId, id);
  }

  // ================= ADMIN =================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('/admin/all')
  getAllOrders(
    @Query('status') status?: OrderStatus,
    @Query('userId') userId?: string,
  ) {
    return this.orderService.getAllOrders(status, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('/admin/:id/status/:status')
  updateOrderStatus(
    @Param('id') id: string,
    @Param('status') status: OrderStatus,
  ) {
    return this.orderService.updateOrderState(id, status);
  }
}