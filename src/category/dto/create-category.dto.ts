import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";

export class CreateCategoryDto {
  @ApiProperty({ example: "Electronics" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "UUID of parent category (for subcategories)" })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
