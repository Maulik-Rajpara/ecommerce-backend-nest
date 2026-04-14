import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";
import { Payment } from "../../payment/entities/payment.entity";

export enum RefundStatus {
  INITIATED = "INITIATED",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

@Entity("refunds")
export class Refund {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Payment, (payment) => payment.refunds, {
    onDelete: "CASCADE",
  })
  payment: Payment;

  @Column()
  paymentId: string;

  @Column({ type: "numeric", precision: 10, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  razorpayRefundId: string;

  @Column({
    type: "enum",
    enum: RefundStatus,
    default: RefundStatus.INITIATED,
  })
  status: RefundStatus;

  @Column({ unique: true, nullable: true })
  idempotencyKey: string;

  @CreateDateColumn()
  createdAt: Date;
}
