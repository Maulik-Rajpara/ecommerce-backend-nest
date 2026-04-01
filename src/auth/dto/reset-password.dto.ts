import { IsNotEmpty } from "class-validator";

// reset-password.dto.ts
export class ResetPasswordDto {
  @IsNotEmpty()
  token: string;

  @IsNotEmpty()
  password: string;
}