// create-product.dto.ts
import { Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsPositive, IsUUID, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price: number;

 
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock: number;

  @IsUUID()
  categoryId: string; // 🔥 important
}