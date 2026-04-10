import { Controller, Post, Get, Req, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createOrder(@Req() req) {
    try {
    
    return this.orderService.createOrder(req.user.userId);
  } catch (err) {
    console.error('❌ CONTROLLER ERROR:', err);
    throw err;
  }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Get()
  getMyOrders(@Req() req) {
    return this.orderService.getMyOrders(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOrder(@Req() req, @Param('id') id: string) {
    return this.orderService.getOrder(req.user.userId, id);
  }
}