import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change.password.dto';
  import * as crypto from 'crypto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from 'src/email/email.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private logger: PinoLogger,
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 🔍 find user
    const user = await this.usersService.findByEmail(email);

    if (!user || typeof user === 'string' || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 🔐 compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 🎟 JWT payload
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // 🔥 generate token
    const token = this.jwtService.sign(payload);

    return {
      accessToken: token,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findByIdWithPassword(userId);

    if (!user ) {
      throw new BadRequestException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);

    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);

  await this.usersService.updatePassword(userId, hashed);

  return {
    statusCode: 200,
    statusMessage: 'Password updated successfully',
    data: null,
  };
}

async forgotPassword(dto: ForgotPasswordDto) {
  const { email } = dto;

  const user = await this.usersService.findByEmail(email);

  if (!user) {
   throw new BadRequestException('Email is not found');
  }

  const token = crypto.randomBytes(32).toString('hex');

  await this.usersService.updateResetPasswordToken(
    user,
    token,
    new Date(Date.now() + 15 * 60 * 1000),
  );

  const resetLink = `http://localhost:3000/reset-password?token=${token}`;

  console.log('Reset Link:', resetLink);
  this.logger.info(`Processing email job...`);
  
   this.emailQueue.add('send-reset-email', {
    email,
     subject: 'Reset Your Password',
      html:
      ` <h3>Password Reset</h3>
        <p>Click below link to reset password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link will expire in 15 minutes</p>
      `,
  }, {
    attempts: 3, // retry 3 times
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },)

 return {
    statusCode: 200,
    statusMessage: 'Reset password link share successfully',
    data: {"resetLink": resetLink}
 }
}

async resetPassword(dto: ResetPasswordDto) {
  const { token, password } = dto;

  const user = await this.usersService.findByResetToken(token);

  if (!user) {
    throw new BadRequestException('Invalid token');
  }

  if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
    throw new BadRequestException('Token expired');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await this.usersService.updatePasswordAndClearToken(
    user,
    hashedPassword,
  );

  return {
    statusCode: 200,
    statusMessage: 'Password reset successful',
    data: null,
  };
}
}