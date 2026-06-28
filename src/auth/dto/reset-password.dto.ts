import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, Matches, MinLength } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({ description: "Reset token received in email" })
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: "NewPassword@123" })
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
}
