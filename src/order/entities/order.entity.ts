import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { OrderItem } from "./order-item.entity";
import { Payment } from "../../payment/entities/payment.entity";
import { Refund } from "../../refund/entities/refund.entity";

export enum OrderStatus {
  PENDING = "PENDING", // order created, payment pending
  PAID = "PAID", // payment success
  FAILED = "FAILED", // payment failed
  CANCELLED = "CANCELLED",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  REFUNDED = "REFUNDED", // fully refunded
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED", // partially refunded
}

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.orders, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user: User;

  @Index()
  @Column({ nullable: true })
  userId: string;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
  })
  items: OrderItem[];

  @Column({ type: "numeric", precision: 10, scale: 2 })
  totalAmount: number;

  @OneToMany(() => Payment, (payment) => payment.order)
  payments: Payment[];

  @Column({
    type: "enum",
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Index()
  @Column({ nullable: true })
  razorpayOrderId: string;

  @Column({ nullable: true })
  paymentId: string;

  @Column({ default: 0 })
  retryCount: number;

  @OneToMany(() => Refund, (refund) => refund.payment)
  refunds: Refund[];

  @Index()
  @Column({ type: "timestamp", nullable: true })
  expiresAt: Date;
}
