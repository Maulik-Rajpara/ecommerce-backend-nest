// product.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "src/auth/guards/roles.guard";
import { Roles } from "src/auth/decorators/roles.decorator";
import { ProductService } from "./product.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { FilesInterceptor } from "@nestjs/platform-express";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("products")
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Roles("admin")
  @Post()
  @UseInterceptors(
    FilesInterceptor("files", 5, {
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new BadRequestException("Invalid file type"), false);
        }
        cb(null, true);
      },
    }),
  )
  create(
    @Body() dto: CreateProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.productService.create(dto, files);
  }

  @Get()
  findAll(
    @Query("page") page = 1,
    @Query("limit") limit = 10,
    @Query("search") search?: string,
    @Query("minPrice") minPrice?: number,
    @Query("maxPrice") maxPrice?: number,
    @Query("sortBy") sortBy: string = "createdAt",
    @Query("order") order: "ASC" | "DESC" = "DESC",
    @Query("categoryId") categoryId?: string,
  ) {
    return this.productService.findAll(
      +page,
      +limit,
      search,
      minPrice ? +minPrice : undefined,
      maxPrice ? +maxPrice : undefined,
      sortBy,
      order,
      categoryId,
    );
  }

  @Get(":id")
  findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.productService.findOne(id);
  }

  @Patch(":id")
  @UseInterceptors(
    FilesInterceptor("files", 5, {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new BadRequestException("Invalid file type"), false);
        }
        cb(null, true);
      },
    }),
  )
  update(
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.productService.update(id, dto, files);
  }

  @Patch("inactive/:id")
  updateStatus(@Param("id") id: string) {
    return this.productService.inActive(id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.productService.remove(id);
  }
}
