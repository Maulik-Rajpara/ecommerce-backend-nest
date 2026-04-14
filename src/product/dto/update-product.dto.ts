import { Type } from "class-transformer";
import {
  IsOptional,
  IsString,
  IsNumber,
  IsUUID,
  IsArray,
} from "class-validator";

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  // 🔥 delete images
  @IsOptional()
  @IsArray()
  deletedImageIds?: string[];

  // 🔥 set primary image
  @IsOptional()
  @IsUUID()
  primaryImageId?: string;
}
