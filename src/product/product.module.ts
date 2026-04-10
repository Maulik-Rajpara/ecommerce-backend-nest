import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { S3Module } from '../s3/s3.module';

import { Category } from '../category/entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductImage, Category]),S3Module],
  providers: [ProductService],
  controllers: [ProductController]
})
export class ProductModule {}
