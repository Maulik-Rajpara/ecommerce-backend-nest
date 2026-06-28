import { Order } from "./order.entity";
import { Product } from "../../product/entities/product.entity";
import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from "typeorm";

@Entity("order_items")
export class OrderItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Order, (order) => order.items, {
    onDelete: "CASCADE",
  })
  order: Order;

  @ManyToOne(() => Product, {
    eager: true, // auto load product
  })
  product: Product;

  @Column()
  quantity: number;

  @Column({ type: "numeric", precision: 10, scale: 2 })
  price: number; // snapshot
}
