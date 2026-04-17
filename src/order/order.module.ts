import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Order } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";

import { OrderService } from "./order.service";
import { OrderController } from "./order.controller";

import { Cart } from "../cart/entities/cart.entity";
import { CartItem } from "../cart/entities/cart-item.entity";
import { Product } from "../product/entities/product.entity";
import { OrderCronService } from "./order.cron";
import { BullModule } from "@nestjs/bullmq";
import { OrderExpiryProcessor } from "./expire.order.process";
import { UsersModule } from "src/users/users.module";
import { User } from "src/users/entities/user.entity";
import { NotificationModule } from "src/notification/notification.module";
import { KafkaModule } from "src/kafka/kafka.module";
//import { PaymentListener } from 'src/common/events/listeners/payment.listener';

@Module({
  imports: [
    BullModule.registerQueue({
      name: "order-expiry",
    }),
    TypeOrmModule.forFeature([Order, OrderItem, Cart, CartItem, Product, User]),
    UsersModule,
    NotificationModule,
    KafkaModule
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderCronService, OrderExpiryProcessor],
  exports: [OrderService, BullModule],
})
export class OrderModule {}
