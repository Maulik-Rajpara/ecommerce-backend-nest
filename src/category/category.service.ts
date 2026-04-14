import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Category } from "./entities/category.entity";
import { Repository } from "typeorm";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { S3Service } from "../s3/s3.service";

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
    private s3Service: S3Service,
  ) {}

  // 🔥 CREATE
  async create(dto: CreateCategoryDto, file?: Express.Multer.File) {
    const slug = dto.name.toLowerCase().replace(/\s+/g, "-");

    const exists = await this.categoryRepo.findOne({ where: { slug } });
    if (exists) {
      throw new BadRequestException("Category already exists");
    }

    let parent: Category | null = null;
    if (dto.parentId) {
      parent = await this.categoryRepo.findOne({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new BadRequestException("Parent category not found");
      }
    }

    let imageUrl: string | null = null;

    if (file) {
      imageUrl = await this.s3Service.uploadFile(file, "categories");
    }

    const category = this.categoryRepo.create({
      name: dto.name,
      slug,
      image: imageUrl ?? undefined,
      parent: parent ?? undefined,
    } as Partial<Category>);

    return this.categoryRepo.save(category);
  }

  // 🔥 GET ALL (TREE)
  async findAll() {
    return this.categoryRepo
      .createQueryBuilder("category")
      .leftJoinAndSelect("category.children", "children")
      .where("category.parent IS NULL")
      .orderBy("category.createdAt", "DESC")
      .addOrderBy("children.createdAt", "ASC")
      .getMany();
  }

  async getCategoryTree() {
    return this.categoryRepo
      .createQueryBuilder("category")
      .leftJoinAndSelect("category.children", "children")
      .where("category.parent IS NULL")
      .orderBy("category.createdAt", "DESC")
      .addOrderBy("children.createdAt", "ASC")
      .getMany();
  }

  // 🔥 GET ONE
  async findOne(id: string) {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ["children", "parent"],
    });

    if (!category) {
      throw new BadRequestException("Category not found");
    }

    return category;
  }

  // 🔥 UPDATE
  async update(id: string, dto: UpdateCategoryDto, file?: Express.Multer.File) {
    const queryRunner =
      this.categoryRepo.manager.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 🔍 existing category
      const category = await queryRunner.manager.findOne(Category, {
        where: { id },
        relations: ["parent"],
      });

      if (!category) {
        throw new BadRequestException("Category not found");
      }

      // =====================================
      // 🧠 NAME + SLUG UPDATE
      // =====================================
      if (dto.name) {
        const slug = dto.name.toLowerCase().replace(/\s+/g, "-");

        const exists = await queryRunner.manager.findOne(Category, {
          where: { slug },
        });

        if (exists && exists.id !== id) {
          throw new BadRequestException("Category already exists");
        }

        category.name = dto.name;
        category.slug = slug;
      }

      // =====================================
      // 🌳 PARENT UPDATE (HIERARCHY SAFE)
      // =====================================
      if (dto.parentId !== undefined) {
        if (dto.parentId === id) {
          throw new BadRequestException("Category cannot be its own parent");
        }

        let parent: Category | null = null;

        if (dto.parentId) {
          parent = await queryRunner.manager.findOne(Category, {
            where: { id: dto.parentId },
            relations: ["parent"],
          });

          if (!parent) {
            throw new BadRequestException("Parent category not found");
          }

          // 🔥 CHECK CIRCULAR DEPENDENCY
          let current: Category | null = parent;

          while (current) {
            if (current.id === id) {
              throw new BadRequestException(
                "Circular category hierarchy detected",
              );
            }

            current = await queryRunner.manager.findOne(Category, {
              where: { id: current.parent?.id },
              relations: ["parent"],
            });
          }
        }

        category.parent = parent;
      }

      // =====================================
      // 🖼 IMAGE UPDATE (S3)
      // =====================================
      if (file) {
        // delete old image
        if (category.image) {
          await this.s3Service.deleteFile(category.image);
        }

        const url = await this.s3Service.uploadFile(file, "categories");
        category.image = url;
      }

      await queryRunner.manager.save(category);

      // ✅ COMMIT
      await queryRunner.commitTransaction();

      return category;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error("Category Update Error:", err);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // 🔥 DELETE
  async remove(id: string) {
    const category = await this.findOne(id);

    if (category.children?.length) {
      throw new BadRequestException(
        "Cannot delete category with subcategories",
      );
    }

    await this.categoryRepo.remove(category);

    return null;
  }

  async findAllAdmin(page = 1, limit = 10, search?: string) {
    limit = Math.min(limit, 50);
    const qb = this.categoryRepo.createQueryBuilder("category");

    // 🔍 search
    if (search) {
      qb.where("LOWER(category.name) LIKE LOWER(:search)", {
        search: `%${search}%`,
      });
    }

    // 📊 sorting
    qb.leftJoinAndSelect("category.parent", "parent");
    qb.orderBy("category.createdAt", "DESC");

    // 📄 pagination
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
      },
    };
  }
}
