import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Body,
  UseGuards,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { GetOrdersDto } from "./dto/get-orders.dto";
import { OrderStatus } from "../order/entities/order.entity";

// 🔥 assume guards already created
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("orders")
  getOrders(@Query() query: GetOrdersDto) {
    return this.adminService.getOrders(query);
  }

  @Get("orders/:id")
  getOrder(@Param("id") id: string) {
    return this.adminService.getOrder(id);
  }

  @Patch("orders/:id/status")
  updateStatus(@Param("id") id: string, @Body("status") status: OrderStatus) {
    return this.adminService.updateStatus(id, status);
  }

  @Post("orders/:id/cancel")
  cancelOrder(@Param("id") id: string) {
    return this.adminService.cancelOrder(id);
  }

  @Get("dashboard")
  dashboard() {
    return this.adminService.getDashboard();
  }
}
