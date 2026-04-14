import { BadRequestException, Injectable } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import * as typeorm from "typeorm";
import * as bcrypt from "bcrypt";
import { PinoLogger } from "nestjs-pino";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: typeorm.Repository<User>,
    private logger: PinoLogger,
    private configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { email, password, firstName, lastName } = createUserDto;

    // 🔥 1. Check duplicate email
    const existingUser = await this.userRepo.findOne({
      where: { email },
    });
    // 🔥 1. Check duplicate email

    if (existingUser) {
      throw new BadRequestException("Email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepo.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
    });

    await this.userRepo.save(user);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { email },
      select: [
        "id",
        "email",
        "password", // 🔥 VERY IMPORTANT
        "role",
        "isActive",
      ],
    });
  }
  async findAll(page = 1, limit = 10, search?: string) {
    const qb = this.userRepo.createQueryBuilder("user");

    if (search) {
      qb.where("user.email ILIKE :search OR user.first_name ILIKE :search", {
        search: `%${search}%`,
      });
    }

    qb.skip((page - 1) * limit).take(limit);

    const [users, total] = await qb.getManyAndCount();
    this.logger.info("Fetching all users");
    return {
      users: users,
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    const sanitizedUser = Object.fromEntries(
      Object.entries(user).filter(([key]) => key !== "password"),
    ) as Omit<User, "password">;

    return {
      statusCode: 200,
      statusMessage: "Success",
      data: sanitizedUser,
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if (Object.keys(updateUserDto).length === 0) {
      throw new BadRequestException("At least one field is required to update");
    }

    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    await this.userRepo.update(id, updateUserDto);

    return {
      statusCode: 200,
      statusMessage: "Updated successfully",
      data: updateUserDto,
    };
  }

  async remove(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    await this.userRepo.remove(user);

    return {
      statusCode: 200,
      statusMessage: "User deleted successfully",
      data: null,
    };
  }

  async findByIdWithPassword(id: string) {
    return this.userRepo.findOne({
      where: { id },
      select: ["id", "password"],
    });
  }

  async updatePassword(id: string, password: string) {
    await this.userRepo.update(id, { password });
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ["id", "email", "firstName", "lastName", "role", "createdAt"],
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }
    this.logger.info("Fetching user profile");
    return {
      statusCode: 200,
      statusMessage: "Success",
      data: user,
    };
  }

  async findByResetToken(token: string) {
    return this.userRepo.findOne({
      where: { resetPasswordToken: token },
    });
  }

  async updateResetPasswordToken(user: User, token: string, expires: Date) {
    user.resetPasswordToken = token;
    user.resetPasswordExpires = expires;
    return this.userRepo.save(user);
  }

  async updatePasswordAndClearToken(user: User, password: string) {
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    return this.userRepo.save(user);
  }

  async findBasicById(id: string) {
    return this.userRepo.findOne({
      where: { id },
      select: ["id", "email", "firstName", "lastName", "role", "isActive"],
    });
  }

  getResetPasswordBaseUrl() {
    return this.configService.get<string>("FRONTEND_RESET_PASSWORD_URL");
  }
}
