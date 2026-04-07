import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../lib/prisma';

export interface AdminPayload {
  adminId: string;
  email: string;
}

/**
 * Parse a duration string like "8h", "7d", "0s" into seconds.
 */
function parseDurationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      throw new Error(`Unknown duration unit: ${unit}`);
  }
}

export class AuthService {
  private expirySeconds: number;

  constructor(
    private jwtSecret: string,
    tokenExpiry: string = '8h',
  ) {
    this.expirySeconds = parseDurationToSeconds(tokenExpiry);
  }

  async verifyCredentials(email: string, password: string) {
    const admin = await prisma.admin.findUnique({ where: { email } });

    if (!admin) {
      return null;
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);

    if (!valid) {
      return null;
    }

    return admin;
  }

  generateToken(admin: { id: string; email: string }): string {
    const payload: AdminPayload = {
      adminId: admin.id,
      email: admin.email,
    };

    const options: SignOptions = {
      expiresIn: this.expirySeconds,
    };

    return jwt.sign(payload, this.jwtSecret, options);
  }

  verifyToken(token: string): AdminPayload {
    return jwt.verify(token, this.jwtSecret) as AdminPayload;
  }
}
