import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

import { Cart } from "./cart.entity";
import { Product } from "../../product/entities/product.entity";

@Entity("cart_items")
@Unique(["cart", "product"])
export class CartItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Cart, (cart) => cart.items, {
    onDelete: "CASCADE",
  })
  cart: Cart;

  @ManyToOne(() => Product, {
    eager: true,
    onDelete: "CASCADE",
  })
  product: Product;

  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price: number; // snapshot

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
