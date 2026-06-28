import { BadRequestException } from "@nestjs/common";
import { OrderStatus } from "../entities/order.entity";
import { ORDER_STATE_TRANSITIONS } from "./order.state.config";

export function validateOrderTransition(
  current: OrderStatus,
  next: OrderStatus,
) {
  const allowed = ORDER_STATE_TRANSITIONS[current] ?? [];

  if (!allowed.includes(next)) {
    throw new BadRequestException(
      `Invalid state transition: ${current} → ${next}`,
    );
  }
}
