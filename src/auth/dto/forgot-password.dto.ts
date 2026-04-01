import { IsEmail } from "class-validator";

// forgot-password.dto.ts
export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}