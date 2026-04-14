import { TypeOrmModule } from "@nestjs/typeorm";
import { Category } from "./entities/category.entity";
import { S3Module } from "../s3/s3.module";
import { CategoryController } from "./category.controller";
import { CategoryService } from "./category.service";
import { Module } from "@nestjs/common";
@Module({
  imports: [TypeOrmModule.forFeature([Category]), S3Module],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}
