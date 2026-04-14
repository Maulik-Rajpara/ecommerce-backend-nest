import { IsNotEmpty, Matches, MinLength } from "class-validator";

// reset-password.dto.ts
export class ResetPasswordDto {
  @IsNotEmpty()
  token: string;

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
