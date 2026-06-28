import { ApiProperty } from "@nestjs/swagger";
import { IsUUID, IsInt, Min } from "class-validator";

export class AddToCartDto {
  @ApiProperty({ description: "UUID of the product to add" })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}
