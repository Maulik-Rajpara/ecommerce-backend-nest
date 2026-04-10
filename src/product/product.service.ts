import { BadRequestException, Injectable } from "@nestjs/common";
import { CreateProductDto } from "./dto/create-product.dto";
import { Product } from "./entities/product.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductImage } from "./entities/product-image.entity";
import { S3Service } from "src/s3/s3.service";
import { Category } from "../category/entities/category.entity";

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,

    @InjectRepository(ProductImage)
    private productImageRepo: Repository<ProductImage>,

    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,

    private s3Service: S3Service,
  ) {}

  // ================= CREATE =================
  async create(dto: CreateProductDto, files?: Express.Multer.File[]) {
    const queryRunner = this.productRepo.manager.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const slug = dto.name.toLowerCase().replace(/\s+/g, "-");

      const exists = await queryRunner.manager.findOne(Product, {
        where: { slug },
      });
      if (exists) throw new BadRequestException("Product already exists");

      const category = await queryRunner.manager.findOne(Category, {
        where: { id: dto.categoryId },
      });
      if (!category) throw new BadRequestException("Category not found");

      if (!files?.length) {
        throw new BadRequestException("At least one product image required");
      }

      const product = queryRunner.manager.create(Product, {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        stock: dto.stock,
        slug,
        category,
      });

      await queryRunner.manager.save(product);

      const images = await Promise.all(
        files.map(async (file, index) => {
          const url = await this.s3Service.uploadFile(file, "products");

          return queryRunner.manager.create(ProductImage, {
            url,
            product,
            isPrimary: index === 0,
          });
        }),
      );

      await queryRunner.manager.save(images);

      await queryRunner.commitTransaction();

      return this.findOne(product.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ================= FIND ALL =================
  async findAll(
    page = 1,
    limit = 10,
    search?: string,
    minPrice?: number,
    maxPrice?: number,
    sortBy: string = "createdAt",
    order: "ASC" | "DESC" = "DESC",
    categoryId?: string,
  ) {
    const qb = this.productRepo.createQueryBuilder("product");

    if (search) {
      qb.andWhere(
        "(product.name ILIKE :search OR product.description ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (minPrice) qb.andWhere("product.price >= :minPrice", { minPrice });
    if (maxPrice) qb.andWhere("product.price <= :maxPrice", { maxPrice });

    if (categoryId) {
      qb.andWhere("product.categoryId = :categoryId", { categoryId });
    }

    qb.andWhere("product.isActive = true");

    qb.leftJoinAndSelect(
      "product.images",
      "images",
      "images.isPrimary = true",
    );

    qb.leftJoinAndSelect("product.category", "category");

    const allowedSortFields = ["price", "createdAt", "name"];
    if (!allowedSortFields.includes(sortBy)) sortBy = "createdAt";

    qb.orderBy(`product.${sortBy}`, order);

    qb.skip((page - 1) * limit).take(limit);

    const [products, total] = await qb.getManyAndCount();

    const formatted = products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      thumbnail: product.images?.[0]?.url, // ✅ optimized
      categoryId: product.category?.id,
      category: product.category?.name,
      createdAt: product.createdAt,
    }));

    return {
      statusCode: 200,
      statusMessage: "Products retrieved successfully",
      data: formatted,
      meta: { total, page, limit },
    };
  }

  // ================= FIND ONE =================
  async findOne(id: string) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ["images", "category"],
    });

    if (!product) {
      throw new BadRequestException("Product not found");
    }

    return product;
  }

  // ================= UPDATE =================
  async update(
    id: string,
    dto: UpdateProductDto,
    files?: Express.Multer.File[],
  ) {
    const queryRunner = this.productRepo.manager.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const s3DeleteQueue: string[] = [];

    try {
      const product = await queryRunner.manager.findOne(Product, {
        where: { id },
        relations: ["images", "category"],
      });

      if (!product) {
        throw new BadRequestException("Product not found");
      }

      // basic fields
      if (dto.name) {
        product.name = dto.name;
        product.slug = dto.name.toLowerCase().replace(/\s+/g, "-");
      }

      if (dto.description !== undefined)
        product.description = dto.description;

      if (dto.price !== undefined) product.price = dto.price;
      if (dto.stock !== undefined) product.stock = dto.stock;

      // category update
      if (dto.categoryId) {
        const category = await queryRunner.manager.findOne(Category, {
          where: { id: dto.categoryId },
        });

        if (!category) throw new BadRequestException("Category not found");

        product.category = category;
      }

      await queryRunner.manager.save(product);

      // ===== DELETE IMAGES =====
      let deletedIds = dto.deletedImageIds ?? [];

      if (deletedIds.length === 1 && typeof deletedIds[0] === "string") {
        deletedIds = deletedIds[0]
          .replace(/[\[\]\s]/g, "")
          .split(",")
          .filter(Boolean);
      }

      if (deletedIds.length > 0) {
        const imagesToDelete = product.images.filter((img) =>
          deletedIds.includes(img.id),
        );

        for (const img of imagesToDelete) {
          s3DeleteQueue.push(img.url); // delay S3 delete
          await queryRunner.manager.remove(img);
        }
      }

      // ===== ADD NEW IMAGES =====
      if (files?.length) {
        const newImages = await Promise.all(
          files.map(async (file) => {
            const url = await this.s3Service.uploadFile(file, "products");

            return queryRunner.manager.create(ProductImage, {
              url,
              product,
              isPrimary: false,
            });
          }),
        );

        await queryRunner.manager.save(newImages);
      }

      // ===== SET PRIMARY =====
      if (dto.primaryImageId) {
        await queryRunner.manager.update(
          ProductImage,
          { product: { id } },
          { isPrimary: false },
        );

        await queryRunner.manager.update(
          ProductImage,
          { id: dto.primaryImageId },
          { isPrimary: true },
        );
      }

      // ===== ENSURE PRIMARY =====
      const finalImages = await queryRunner.manager.find(ProductImage, {
        where: { product: { id } },
      });

      if (finalImages.length > 0) {
        const hasPrimary = finalImages.some((img) => img.isPrimary);

        if (!hasPrimary) {
          finalImages[0].isPrimary = true;
          await queryRunner.manager.save(finalImages[0]);
        }
      }

      await queryRunner.commitTransaction();

      // 🔥 S3 delete AFTER commit
      for (const url of s3DeleteQueue) {
        await this.s3Service.deleteFile(url);
      }

      return this.findOne(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ================= TOGGLE ACTIVE =================
  async inActive(id: string) {
    const product = await this.productRepo.findOne({ where: { id } });

    if (!product) throw new BadRequestException("Product not found");

    product.isActive = !product.isActive;

    await this.productRepo.save(product);

    return null;
  }

  // ================= DELETE =================
  async remove(id: string) {
    const product = await this.productRepo.findOne({ where: { id } });

    if (!product) throw new BadRequestException("Product not found");

    await this.productRepo.softRemove(product);

    return {
      statusCode: 200,
      statusMessage: "Product deleted successfully",
      data: null,
    };
  }
}