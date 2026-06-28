import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ProcessedEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  eventKey: string;
}
