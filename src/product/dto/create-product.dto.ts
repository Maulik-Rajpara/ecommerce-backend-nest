import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  Min,
} from "class-validator";

export class CreateProductDto {
  @ApiProperty({ example: "Wireless Headphones" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: "Noise-cancelling over-ear headphones" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1999.99, description: "Price in INR" })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ example: 50, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ description: "UUID of the category" })
  @IsUUID()
  categoryId: string;
}
