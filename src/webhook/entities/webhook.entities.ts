import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class WebhookEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  eventId: string;

  @Column()
  eventType: string;
}
