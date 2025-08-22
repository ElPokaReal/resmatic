import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { createHash } from 'crypto';

@Injectable()
export class RefreshTokensService {
  constructor(private readonly prisma: PrismaService) {}

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async store(userId: string, refreshToken: string, expiresAt: Date) {
    const tokenHash = this.hash(refreshToken);
    return this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  async findValid(userId: string, refreshToken: string) {
    const tokenHash = this.hash(refreshToken);
    return this.prisma.refreshToken.findFirst({
      where: { userId, tokenHash, revoked: false },
    });
  }

  async revokeById(id: string) {
    return this.prisma.refreshToken.update({ where: { id }, data: { revoked: true } });
  }

  async revokeAllForUser(userId: string) {
    await this.prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
  }

  async listActiveForUser(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: { userId, revoked: false },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
  }

  async enforceSessionLimit(userId: string, limit: number) {
    if (!Number.isFinite(limit) || limit <= 0) return; // disabled if <= 0
    const active = await this.listActiveForUser(userId);
    if (active.length <= limit) return;
    const revokeIds = active.slice(limit).map((t) => t.id);
    await this.prisma.refreshToken.updateMany({ where: { id: { in: revokeIds } }, data: { revoked: true } });
  }
}
