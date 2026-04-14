// product.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  Index,
  DeleteDateColumn,
} from "typeorm";
import { ProductImage } from "./product-image.entity";
import { Category } from "../../category/entities/category.entity";
import { Min } from "class-validator";

@Entity("products")
export class Product {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column()
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Index()
  @Min(1)
  @Column({ type: "decimal", precision: 10, scale: 2 })
  price: number;

  @Min(0)
  @Column({ default: 0 })
  stock: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => ProductImage, (image) => image.product, {
    cascade: true,
  })
  images: ProductImage[];

  @Index()
  @ManyToOne(() => Category, (category) => category.products, {
    nullable: false,
    onDelete: "RESTRICT", // category delete ho to product safe rahe
  })
  category: Category;

  @Column({ unique: true })
  slug: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
