import { IsNotEmpty, Matches, MinLength } from "class-validator";

export class ChangePasswordDto {
  @IsNotEmpty()
  currentPassword: string;

  @IsNotEmpty()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        "Password must be minimum 8 characters, include uppercase, lowercase, number and special character",
    },
  )
  newPassword: string;
}
