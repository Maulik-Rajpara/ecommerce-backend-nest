import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";

import { Cart } from "./entities/cart.entity";
import { CartItem } from "./entities/cart-item.entity";
import { Product } from "../product/entities/product.entity";

import { AddToCartDto } from "./dto/add-to-cart.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";

@Injectable()
export class CartService {
  private MAX_CART_ITEMS = 50;
  private MAX_QUANTITY_PER_ITEM = 10;

  constructor(
    private dataSource: DataSource,

    @InjectRepository(Cart)
    private cartRepo: Repository<Cart>,

    @InjectRepository(CartItem)
    private cartItemRepo: Repository<CartItem>,

    @InjectRepository(Product)
    private productRepo: Repository<Product>,
  ) {}

  // ================= HELPER =================
  private calculateTotal(cart: Cart) {
    return cart.items.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0,
    );
  }

  // ================= GET OR CREATE CART =================
  async getOrCreateCart(userId: string) {
    let cart = await this.cartRepo.findOne({
      where: { user: { id: userId } },
      relations: ["items", "items.product"],
    });

    if (!cart) {
      cart = this.cartRepo.create({
        user: { id: userId },
      });

      await this.cartRepo.save(cart);
    }

    return cart;
  }

  // ================= ADD TO CART =================
  async addToCart(userId: string, dto: AddToCartDto) {
    if (dto.quantity <= 0) {
      throw new BadRequestException("Quantity must be greater than 0");
    }

    if (dto.quantity > this.MAX_QUANTITY_PER_ITEM) {
      throw new BadRequestException("Max quantity exceeded");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 🔒 lock product (prevent race condition)
      const product = await queryRunner.manager.findOne(Product, {
        where: { id: dto.productId, isActive: true },
        lock: { mode: "pessimistic_write" },
      });

      if (!product) {
        throw new BadRequestException("Product not found");
      }

      if (product.stock < dto.quantity) {
        throw new BadRequestException("Insufficient stock");
      }

      let cart = await queryRunner.manager.findOne(Cart, {
        where: { user: { id: userId } },
        relations: ["items"],
      });

      if (!cart) {
        cart = queryRunner.manager.create(Cart, {
          user: { id: userId },
        });
        await queryRunner.manager.save(cart);
      }

      const cartItemsCount = cart?.items?.length || 0;

      // 🧠 cart size limit

      if (cartItemsCount >= this.MAX_CART_ITEMS) {
        throw new BadRequestException("Cart limit exceeded");
      }

      let item = await queryRunner.manager.findOne(CartItem, {
        where: {
          cart: { id: cart.id },
          product: { id: product.id },
        },
      });

      if (item) {
        item.quantity += dto.quantity;

        if (item.quantity > product.stock) {
          throw new BadRequestException("Stock exceeded");
        }

        if (item.quantity > this.MAX_QUANTITY_PER_ITEM) {
          throw new BadRequestException("Max quantity per item exceeded");
        }
      } else {
        item = queryRunner.manager.create(CartItem, {
          cart,
          product,
          quantity: dto.quantity,
          price: product.price, // snapshot
        });
      }

      await queryRunner.manager.save(item);

      await queryRunner.commitTransaction();

      return {
        statusCode: 200,
        statusMessage: "Item added to cart",
        data: null,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error("add cart error ", err);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ================= GET CART =================
  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    const total = this.calculateTotal(cart);

    return {
      statusCode: 200,
      statusMessage: "Cart fetched successfully",
      data: {
        ...cart,
        total,
      },
    };
  }

  // ================= UPDATE ITEM =================
  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    if (dto.quantity < 0) {
      throw new BadRequestException("Invalid quantity");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // STEP 1 — lock base row
      const item = await queryRunner.manager
        .createQueryBuilder(CartItem, "cartItem")
        .where("cartItem.id = :id", { id: itemId })
        .setLock("pessimistic_write")
        .getOne();

      if (!item) {
        throw new BadRequestException("Cart item not found");
      }

      // STEP 2 — load relations PROPERLY
      const itemWithRelations = await queryRunner.manager.findOne(CartItem, {
        where: { id: itemId, cart: { user: { id: userId } } },
        relations: ["product", "cart", "cart.user"],
      });

      if (!itemWithRelations || !itemWithRelations.product) {
        throw new BadRequestException("Product not found");
      }

      // 🧠 quantity = 0 → delete
      if (dto.quantity === 0) {
        await queryRunner.manager.remove(item);

        await queryRunner.commitTransaction();

        return {
          statusCode: 200,
          statusMessage: "Item removed from cart",
          data: null,
        };
      }

      if (dto.quantity > itemWithRelations.product.stock) {
        throw new BadRequestException("Insufficient stock");
      }

      if (dto.quantity > this.MAX_QUANTITY_PER_ITEM) {
        throw new BadRequestException("Max quantity exceeded");
      }

      item.quantity = dto.quantity;

      await queryRunner.manager.save(item);

      await queryRunner.commitTransaction();

      return {
        statusCode: 200,
        statusMessage: "Cart updated successfully",
        data: null,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error("update cart error ", err);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ================= REMOVE ITEM =================
  async removeItem(userId: string, itemId: string) {
    const item = await this.cartItemRepo.findOne({
      where: {
        id: itemId,
        cart: { user: { id: userId } },
      },
    });

    if (!item) {
      throw new BadRequestException("Cart item not found");
    }

    await this.cartItemRepo.remove(item);

    return {
      statusCode: 200,
      statusMessage: "Item removed from cart",
      data: null,
    };
  }

  // ================= CLEAR CART =================
  async clearCart(userId: string) {
    const cart = await this.cartRepo.findOne({
      where: { user: { id: userId } },
      relations: ["items"],
    });

    if (!cart || cart.items.length === 0) {
      return {
        statusCode: 200,
        statusMessage: "Cart already empty",
        data: null,
      };
    }

    await this.cartItemRepo.remove(cart.items);

    return {
      statusCode: 200,
      statusMessage: "Cart cleared successfully",
      data: null,
    };
  }
}
