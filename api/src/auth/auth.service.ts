import { Injectable } from '@nestjs/common';
import { Profile } from 'passport-google-oauth20';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  isGoogleConfigured() {
    return Boolean(
      process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_CLIENT_ID !== 'not-configured',
    );
  }

  async upsertGoogleUser(
    profile: Profile,
    accessToken: string,
    refreshToken: string,
  ) {
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new Error('Google account has no email.');
    }
    const name = profile.displayName || null;
    const expiry = new Date(Date.now() + 55 * 60 * 1000);

    const existing = await this.prisma.user.findUnique({ where: { googleId } });
    const user = await this.prisma.user.upsert({
      where: { googleId },
      create: {
        googleId,
        email,
        name,
        accessToken,
        refreshToken: refreshToken || null,
        tokenExpiry: expiry,
      },
      update: {
        email,
        name,
        accessToken,
        refreshToken: refreshToken || existing?.refreshToken || null,
        tokenExpiry: expiry,
      },
    });

    return { id: user.id, email: user.email, name: user.name };
  }

  async getUserRecord(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getAnyConnectedUser() {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ refreshToken: { not: null } }, { accessToken: { not: null } }],
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateTokens(
    id: string,
    tokens: {
      accessToken?: string;
      refreshToken?: string;
      tokenExpiry?: Date;
    },
  ) {
    return this.prisma.user.update({
      where: { id },
      data: tokens,
    });
  }
}
