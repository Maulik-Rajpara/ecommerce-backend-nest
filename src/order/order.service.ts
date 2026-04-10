import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, LessThan } from 'typeorm';

import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';

import { Cart } from '../cart/entities/cart.entity';
import { Product } from '../product/entities/product.entity';
import { CartItem } from '../cart/entities/cart-item.entity';

@Injectable()
export class OrderService {
  constructor(
    private dataSource: DataSource,

    @InjectRepository(Order)
    private orderRepo: Repository<Order>,

    @InjectRepository(OrderItem)
    private orderItemRepo: Repository<OrderItem>,

    @InjectRepository(Cart)
    private cartRepo: Repository<Cart>,

    @InjectRepository(Product)
    private productRepo: Repository<Product>,
  ) {}

  // ================= CREATE ORDER =================
  async createOrder(userId: string) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cart = await queryRunner.manager.findOne(Cart, {
        where: { user: { id: userId } },
        relations: ['items', 'items.product'],
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      const existingOrder = await queryRunner.manager.findOne(Order, {
        where: {
          userId: userId,
          status: OrderStatus.PENDING,
        },
      });

      if (existingOrder) {
        await queryRunner.rollbackTransaction();
        return {
          statusCode: 200,
          statusMessage: 'Existing pending order',
          data: existingOrder,
        };
      }

      let total = 0;

      for (const item of cart.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.product.id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!product || !product.isActive) {
          throw new BadRequestException('Invalid product');
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}`,
          );
        }

        total += Number(item.price) * item.quantity;
      }

      const order = queryRunner.manager.create(Order, {
        userId: userId,
        totalAmount: total,
        status: OrderStatus.PENDING,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      await queryRunner.manager.save(order);

      for (const item of cart.items) {
        const orderItem = queryRunner.manager.create(OrderItem, {
          order,
          product: item.product,
          quantity: item.quantity,
          price: item.price,
        });

        await queryRunner.manager.save(orderItem);
      }

      await queryRunner.commitTransaction();

      return {
        statusCode: 201,
        statusMessage: 'Order created (pending payment)',
        data: order,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ================= PAYMENT SUCCESS =================
  async handlePaymentSuccess(orderId: string, paymentId: string) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        relations: ['items', 'items.product'],
      });

      if (!order) throw new BadRequestException('Order not found');

      if (order.status === OrderStatus.PAID) {
        await queryRunner.commitTransaction();
        return;
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException('Invalid order state');
      }

      order.status = OrderStatus.PAID;
      order.paymentId = paymentId;

      await queryRunner.manager.save(order);

      for (const item of order.items) {
        await queryRunner.manager.decrement(
          Product,
          { id: item.product.id },
          'stock',
          item.quantity,
        );
      }

      if (order.userId) {
          const cart = await queryRunner.manager.findOne(Cart, {
            where: { user: { id: order.userId } },
          });

          if (cart) {
            await queryRunner.manager.delete(CartItem, {
              cart: { id: cart.id },
            });
          }
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ================= PAYMENT FAILED =================
  async handlePaymentFailed(orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
    });

    if (!order) return;

    if (order.status === OrderStatus.PAID) return;

    order.status = OrderStatus.CANCELLED;
    await this.orderRepo.save(order);
  }

  // ================= GET MY ORDERS =================
  async getMyOrders(userId: string) {
    const orders = await this.orderRepo.find({
      where: { userId },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });

    return {
      statusCode: 200,
      statusMessage: 'Orders fetched',
      data: orders,
    };
  }

  // ================= GET SINGLE ORDER =================
  async getOrder(userId: string, orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, userId },
      relations: ['items', 'items.product'],
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    return {
      statusCode: 200,
      statusMessage: 'Order fetched',
      data: order,
    };
  }
}