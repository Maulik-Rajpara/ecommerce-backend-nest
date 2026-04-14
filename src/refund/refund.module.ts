import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Refund } from "./entities/refund.entity";
import { RefundService } from "./refund.service";
import { RefundController } from "./refund.controller";
import { Payment } from "../payment/entities/payment.entity";
import { Order } from "../order/entities/order.entity";
import { OrderModule } from "src/order/order.module";
import { UsersModule } from "src/users/users.module";
import { User } from "src/users/entities/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Refund, Payment, Order, User]),
    OrderModule,
    UsersModule,
  ],
  providers: [RefundService],
  controllers: [RefundController],
})
export class RefundModule {}
