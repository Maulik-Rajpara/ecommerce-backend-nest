// src/event-store/entities/event-store.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export enum EventStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  PROCESSED = "PROCESSED",
  FAILED = "FAILED",
  DEAD = "DEAD",
}

@Entity()
export class EventStore {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  type: string;

  @Column()
  aggregateId: string;

  @Column({ type: "jsonb" })
  payload: any;

  @Column({ unique: true })
  idempotencyKey: string;

  @Column({
    type: "enum",
    enum: EventStatus,
    default: EventStatus.PENDING,
  })
  status: EventStatus;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ nullable: true })
  error: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date;
}