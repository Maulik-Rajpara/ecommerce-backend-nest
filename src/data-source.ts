import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';

import { User } from './users/entities/user.entity';
import { Product } from './product/entities/product.entity';
import { ProductImage } from './product/entities/product-image.entity';
import { Cart } from './cart/entities/cart.entity';
import { CartItem } from './cart/entities/cart-item.entity';
import { Order } from './order/entities/order.entity';
import { OrderItem } from './order/entities/order-item.entity';
import { Payment } from './payment/entities/payment.entity';
import { Category } from './category/entities/category.entity';
import { Refund } from './refund/entities/refund.entity';
import { WebhookEvent } from './webhook/entities/webhook.entities';
import { EventStore } from './event-store/entities/event-store.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: false,

 entities: [User, Category, Product, ProductImage, Cart, CartItem, Order , OrderItem, Payment, Refund,
  WebhookEvent, EventStore
 ],
  migrations: ['src/migrations/*.ts'],
});

