import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { IUserRepository, userRepository } from '../repositories/user.repository.js';
import { UserProfile, toUserProfile } from '../models/user.model.js';
import { InvalidCredentialsError, AccountInactiveError, ValidationError } from '../utils/errors.js';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export interface AuthResult {
  token: string;
  user: UserProfile;
}

export interface JwtPayload {
  id: number;
  email: string;
  vai_tro: string;
}

export class AuthService {
  constructor(private readonly userRepo: IUserRepository = userRepository) {}

  async login(input: LoginInput): Promise<AuthResult> {
    const parseResult = loginSchema.safeParse(input);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more request fields.',
        parseResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const { email, password } = parseResult.data;
    const user = await this.userRepo.findByEmail(email);

    // Uniform generic message for non-existent users to prevent enumeration
    if (!user) {
      throw new InvalidCredentialsError();
    }

    // Account status check: reject inactive/locked accounts
    if (user.trang_thai !== 'hoat_dong') {
      throw new AccountInactiveError();
    }

    // Compare password with bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.mat_khau);
    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    const payload: JwtPayload = {
      id: Number(user.id),
      email: user.email,
      vai_tro: user.vai_tro,
    };

    const signOptions: SignOptions = {
      expiresIn: (env.JWT_EXPIRES_IN || '8h') as SignOptions['expiresIn'],
    };
    const token = jwt.sign(payload, env.JWT_SECRET, signOptions);

    return {
      token,
      user: toUserProfile(user),
    };
  }

  async getProfile(userId: number): Promise<UserProfile | null> {
    const user = await this.userRepo.findById(userId);
    if (!user || user.trang_thai !== 'hoat_dong') {
      return null;
    }
    return toUserProfile(user);
  }

  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }
}

export const authService = new AuthService();
