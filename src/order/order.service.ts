import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import { Order, OrderStatus } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";

import { Cart } from "../cart/entities/cart.entity";
import { Product } from "../product/entities/product.entity";
import { CartItem } from "../cart/entities/cart-item.entity";

import { Queue } from "bullmq";
import { InjectQueue } from "@nestjs/bullmq";
import { JOBS, QUEUES } from "src/async/async.constants";

import { validateOrderTransition } from "./state/order.state.validate";

import { UsersService } from "src/users/users.service";
import { NotificationService } from "src/notification/notification.service";
import { KafkaService } from "src/kafka/kafka.service";
import { KAFKA_TOPICS } from "src/kafka/kafka-topics.constants";

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

    @InjectQueue(QUEUES.ORDER_EXPIRY) private orderQueue: Queue,

    private userService: UsersService,
    private notificationService: NotificationService,
    private kafkaService: KafkaService,
  ) {}

  // ================= CREATE ORDER =================
  async createOrder(userId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cart = await queryRunner.manager.findOne(Cart, {
        where: { user: { id: userId } },
        relations: ["items", "items.product"],
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException("Cart is empty");
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
          statusMessage: "Existing pending order",
          data: existingOrder,
        };
      }

      let total = 0;

      for (const item of cart.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.product.id },
          lock: { mode: "pessimistic_write" },
        });

        if (!product || !product.isActive) {
          throw new BadRequestException("Invalid product");
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}`,
          );
        }

        total += Number(item.price) * item.quantity;
      }

      const order = queryRunner.manager.create(Order, {
        userId,
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

      // async job
      await this.orderQueue.add(
        JOBS.ORDER_EXPIRE,
        { orderId: order.id },
        { delay: 15 * 60 * 1000 },
      );

      return {
        statusCode: 201,
        statusMessage: "Order created",
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
  async handlePaymentSuccess(razorpayOrderId: string, paymentId: string) {
    // 🔹 QueryRunner create → manual transaction control
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect(); // 🔹 DB connection attach
    await queryRunner.startTransaction(); // 🔹 BEGIN TRANSACTION

    try {
      // =========================================================
      // STEP 1: LOCK ONLY ORDER (NO RELATIONS ❗)
      // =========================================================
      const order = await queryRunner.manager.findOne(Order, {
        where: { razorpayOrderId },

        // 🔥 CRITICAL: lock only base table
        lock: { mode: "pessimistic_write" },
      });

      // 🔹 if order not found → stop safely
      if (!order) {
        console.warn("⚠️ Order not found for webhook", {
          razorpayOrderId,
        });
        await queryRunner.rollbackTransaction();
        return;
      }

      // =========================================================
      // STEP 2: IDEMPOTENCY CHECK (VERY IMPORTANT 🔥)
      // =========================================================

      // 🔹 already processed payment → skip
      if (order.paymentId) {
        console.log("⚠️ Payment already processed, skipping...");
        await queryRunner.commitTransaction(); // release lock
        return;
      }

      // 🔹 already marked paid → skip
      if (order.status === OrderStatus.PAID) {
        console.warn("⚠️ Already paid (duplicate webhook)", {
          orderId: order.id,
        });
        await queryRunner.commitTransaction();
        return;
      }

      // 🔹 validate state transition (business rule)
      validateOrderTransition(order.status, OrderStatus.PAID);

      // =========================================================
      // STEP 3: LOAD RELATIONS SEPARATELY (NO LOCK ❗)
      // =========================================================
      const orderWithItems = await queryRunner.manager.findOne(Order, {
        where: { id: order.id },
        relations: ["items", "items.product"],
      });

      // =========================================================
      // STEP 4: UPDATE ORDER
      // =========================================================
      order.status = OrderStatus.PAID; // mark paid
      order.paymentId = paymentId; // store payment id

      await queryRunner.manager.save(order); // persist changes

      // =========================================================
      // STEP 5: REDUCE STOCK
      // =========================================================
      if (!orderWithItems) {
        await queryRunner.rollbackTransaction();
        return;
      }
      for (const item of orderWithItems.items) {
        // 🔹 atomic decrement → no race condition
        await queryRunner.manager.decrement(
          Product,
          { id: item.product.id },
          "stock",
          item.quantity,
        );
      }

      // =========================================================
      // STEP 6: CLEAR USER CART
      // =========================================================
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

      // =========================================================
      // STEP 7: COMMIT TRANSACTION
      // =========================================================
      await queryRunner.commitTransaction(); // 🔥 ALL DB SAFE NOW

      // =========================================================
      // STEP 8: OUTSIDE TRANSACTION SIDE EFFECTS
      // =========================================================

      // 🔹 fetch user (no lock needed now)
      const user = await this.userService.findBasicById(order.userId);

      // 🔹 send notification (external system)
      await this.notificationService.sendOrderPaid({
        orderId: order.id,
        userId: order.userId,
        email: user?.email,
      });
    } catch (err) {
      console.error("Error in handlePaymentSuccess:", err);

      // 🔹 rollback everything if error
      await queryRunner.rollbackTransaction();

      return; // ❗ DO NOT THROW → avoids Kafka retry loop
    } finally {
      // 🔹 always release connection
      await queryRunner.release();
    }
  }

  // ================= PAYMENT FAILED =================
  async handlePaymentFailed(razorpayOrderId: string) {
    const order = await this.orderRepo.findOne({
      where: { razorpayOrderId },
    });

    if (!order) return;

    // ✅ already final state → ignore
    if (
      order.status === OrderStatus.PAID ||
      order.status === OrderStatus.CANCELLED
    ) {
      console.log("⚠️ Skipping duplicate payment failure event");
      return;
    }

    // ✅ validate only when needed
    validateOrderTransition(order.status, OrderStatus.CANCELLED);

    order.status = OrderStatus.CANCELLED;
    await this.orderRepo.save(order);
  }

  // ================= EXPIRE ORDER =================
  async expireOrder(orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
    });

    if (!order || order.status !== OrderStatus.PENDING) return;

    validateOrderTransition(order.status, OrderStatus.CANCELLED);

    order.status = OrderStatus.CANCELLED;
    await this.orderRepo.save(order);
    await this.kafkaService.emit(KAFKA_TOPICS.ORDER_EXPIRED, {
      orderId: order.id,
      userId: order.userId,
    });
  }

  // ================= GENERIC =================

  async findById(orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException("Order not found");
    }

    return order;
  }

  async save(order: Order) {
    return this.orderRepo.save(order);
  }

  async incrementRetryCount(orderId: string) {
    await this.orderRepo.increment({ id: orderId }, "retryCount", 1);
  }

  async updateRazorpayOrderId(orderId: string, razorpayOrderId: string) {
    await this.orderRepo.update(orderId, { razorpayOrderId });
  }

  // ⚠️ ONLY FOR NON-TRANSACTION USE
  async updateOrderState(orderId: string, nextStatus: OrderStatus) {
    const order = await this.findById(orderId);

    // ✅ IDEMPOTENCY
    if (order.status === nextStatus) {
      console.log("⚠️ Same state, skipping");
      return order;
    }

    validateOrderTransition(order.status, nextStatus);

    order.status = nextStatus;
    return this.orderRepo.save(order);
  }

  async getAllOrders(status?: OrderStatus, userId?: string) {
    const query = this.orderRepo.createQueryBuilder("order");

    if (status) {
      query.andWhere("order.status = :status", { status });
    }

    if (userId) {
      query.andWhere("order.userId = :userId", { userId });
    }

    const orders = await query
      .leftJoinAndSelect("order.items", "items")
      .leftJoinAndSelect("items.product", "product")
      .orderBy("order.createdAt", "DESC")
      .getMany();

    return {
      statusCode: 200,
      data: orders,
    };
  }

  // ================= USER METHODS =================

  // ✅ GET MY ORDERS
  async getMyOrders(userId: string) {
    const orders = await this.orderRepo.find({
      where: { userId },
      relations: ["items", "items.product"],
      order: { createdAt: "DESC" },
    });

    return {
      statusCode: 200,
      statusMessage: "Orders fetched successfully",
      data: orders,
    };
  }

  // ✅ GET SINGLE ORDER
  async getOrder(userId: string, orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, userId },
      relations: ["items", "items.product"],
    });

    if (!order) {
      throw new BadRequestException("Order not found");
    }

    return {
      statusCode: 200,
      statusMessage: "Order fetched successfully",
      data: order,
    };
  }
}
