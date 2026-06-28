import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AdminService } from "./admin.service";

import { Order } from "../order/entities/order.entity";
import { AdminController } from "./admin.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
