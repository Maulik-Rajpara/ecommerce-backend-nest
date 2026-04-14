import { OrderStatus } from "../entities/order.entity";

export const ORDER_STATE_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.PAID, OrderStatus.CANCELLED],
  PAID: [
    OrderStatus.SHIPPED,
    OrderStatus.PARTIALLY_REFUNDED,
    OrderStatus.REFUNDED,
  ],
  SHIPPED: [
    OrderStatus.DELIVERED,
    OrderStatus.PARTIALLY_REFUNDED,
    OrderStatus.REFUNDED,
  ],
  DELIVERED: [OrderStatus.PARTIALLY_REFUNDED, OrderStatus.REFUNDED],
  PARTIALLY_REFUNDED: [OrderStatus.PARTIALLY_REFUNDED, OrderStatus.REFUNDED],
  FAILED: [],
  REFUNDED: [],
  CANCELLED: [],
};
