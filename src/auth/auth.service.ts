import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { EmailService } from './email.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private emailService: EmailService,
  ) {}

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async register(dto: RegisterDto) {
    // Check email
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      if (!existing.isVerified && existing.role === 'CUSTOMER') {
        const otp = this.generateOtp();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await this.prisma.user.update({
          where: { email: dto.email },
          data: { otp, otpExpiresAt },
        });

        await this.emailService.sendOtp(dto.email, otp, existing.firstName);

        return {
          message: 'Account already exists but is not verified. A new OTP has been sent to your email.',
          requiresVerification: true,
          email: dto.email,
        };
      }
      throw new ConflictException('Email already in use.');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const otp = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'CUSTOMER',
        isVerified: false,
        otp,
        otpExpiresAt,
      },
    });

    await this.emailService.sendOtp(dto.email, otp, user.firstName);

    return {
      message: 'Account created. Please check your email for the verification code.',
      requiresVerification: true,
      email: dto.email,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new BadRequestException('Account not found.');
    if (user.isVerified) throw new BadRequestException('Account is already verified.');

    if (!user.otp || !user.otpExpiresAt) {
      throw new BadRequestException('No OTP found. Please request a new one.');
    }

    if (new Date() > user.otpExpiresAt) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    if (user.otp !== dto.otp) {
      throw new BadRequestException('Invalid OTP. Please try again.');
    }

    await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        isVerified: true,
        otp: null,
        otpExpiresAt: null,
      },
    });

    return { message: 'Account verified successfully. You can now log in.' };
  }

  async resendOtp(dto: ResendOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new BadRequestException('Account not found.');
    if (user.isVerified) throw new BadRequestException('Account is already verified.');

    const otp = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { email: dto.email },
      data: { otp, otpExpiresAt },
    });

    await this.emailService.sendOtp(dto.email, otp, user.firstName);

    return { message: 'A new OTP has been sent to your email.' };
  }

  async login(dto: LoginDto) {
    const identifier = dto.identifier;

    // Detect if input is email or username
    const isEmail = identifier.includes('@');

    let user;

    if (isEmail) {
      user = await this.prisma.user.findUnique({
        where: { email: identifier },
      });
    } else {
      user = await this.prisma.user.findUnique({
        where: { username: identifier },
      });
    }

    if (!user) throw new UnauthorizedException('Invalid credentials.');

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials.');

    // Block unverified customers
    if (user.role === 'CUSTOMER' && !user.isVerified) {
      throw new UnauthorizedException(
        JSON.stringify({
          requiresVerification: true,
          email: user.email,
          message: 'Please verify your email before logging in.',
        }),
      );
    }

    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) throw new UnauthorizedException('User not found.');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: any = {};

    if (dto.firstName) data.firstName = dto.firstName;
    if (dto.lastName) data.lastName = dto.lastName;
    if (dto.newPassword && dto.currentPassword) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new BadRequestException('User not found.');
      const match = await bcrypt.compare(dto.currentPassword, user.password);
      if (!match) throw new BadRequestException('Current password is incorrect.');
      data.password = await bcrypt.hash(dto.newPassword, 10);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });
  }
}