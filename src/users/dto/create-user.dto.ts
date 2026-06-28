import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  Matches,
  IsOptional,
} from "class-validator";

export class CreateUserDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "Password@123", minLength: 8 })
  @IsNotEmpty()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        "Password must be minimum 8 characters, include uppercase, lowercase, number and special character",
    },
  )
  password: string;

  @ApiProperty({ example: "John" })
  @IsNotEmpty()
  firstName: string;

  @ApiPropertyOptional({ example: "Doe" })
  @IsOptional()
  lastName?: string;
}
