import { IsEmail, IsNotEmpty, MinLength, Matches, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must be minimum 8 characters, include uppercase, lowercase, number and special character',
    },
  )
  password: string;

  @IsNotEmpty()
  firstName: string;

  @IsOptional()
  lastName?: string;
}


