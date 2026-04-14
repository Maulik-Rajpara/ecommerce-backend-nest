import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, FindOptionsWhere } from "typeorm";
import { Order, OrderStatus } from "../order/entities/order.entity";
import { GetOrdersDto } from "./dto/get-orders.dto";
import { validateOrderTransition } from "../order/state/order.state.validate";

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
  ) {}

  // 🔥 GET ORDERS WITH PAGINATION + FILTERS
  async getOrders(query: GetOrdersDto) {
    try {
      const {
        status,
        userId,
        startDate,
        endDate,
        page = "1",
        limit = "10",
      } = query;

      const take = Number(limit);
      const skip = (Number(page) - 1) * take;

      const where: FindOptionsWhere<Order> = {};

      if (status) where.status = status;
      if (userId) where.userId = userId;

      if (startDate && endDate) {
        where.createdAt = Between(new Date(startDate), new Date(endDate));
      }

      const [orders, total] = await this.orderRepo.findAndCount({
        where,
        relations: ["items", "items.product"],
        order: { createdAt: "DESC" },
        skip,
        take,
      });

      return {
        statusCode: 200,
        statusMessage: "Orders fetched",
        data: orders,
        meta: {
          total,
          page: Number(page),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      };
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw new BadRequestException("Failed to fetch orders");
    }
  }

  // 🔥 GET SINGLE ORDER
  async getOrder(id: string) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ["items", "items.product"],
    });

    if (!order) throw new BadRequestException("Order not found");

    return {
      statusCode: 200,
      statusMessage: "Order fetched",
      data: order,
    };
  }

  // 🔥 UPDATE STATUS
  async updateStatus(orderId: string, status: OrderStatus) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });

    if (!order) throw new BadRequestException("Order not found");

    validateOrderTransition(order.status, status);
    order.status = status;
    await this.orderRepo.save(order);

    return {
      statusCode: 200,
      statusMessage: "Order status updated",
      data: null,
    };
  }

  // 🔥 CANCEL ORDER
  async cancelOrder(orderId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });

    if (!order) throw new BadRequestException("Order not found");

    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException("Cannot cancel delivered order");
    }

    validateOrderTransition(order.status, OrderStatus.CANCELLED);
    order.status = OrderStatus.CANCELLED;
    await this.orderRepo.save(order);

    return {
      statusCode: 200,
      statusMessage: "Order cancelled",
      data: null,
    };
  }

  // 🔥 DASHBOARD
  async getDashboard() {
    const totalOrders = await this.orderRepo.count();

    const totalRevenue = (await this.orderRepo
      .createQueryBuilder("order")
      .select("SUM(order.totalAmount)", "sum")
      .where("order.status = :status", { status: OrderStatus.PAID })
      .getRawOne()) as { sum: string | null };

    const pendingOrders = await this.orderRepo.count({
      where: { status: OrderStatus.PENDING },
    });

    return {
      statusCode: 200,
      statusMessage: "Dashboard fetched",
      data: {
        totalOrders,
        totalRevenue: totalRevenue.sum || 0,
        pendingOrders,
      },
    };
  }
}
