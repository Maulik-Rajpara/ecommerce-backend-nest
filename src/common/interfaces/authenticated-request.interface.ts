import { Request } from "express";
import { UserRole } from "../../users/entities/user.entity";

export interface JwtUser {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user: JwtUser;
}
