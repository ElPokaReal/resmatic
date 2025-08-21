import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma/prisma.service';
import { PublicUser } from './user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async validateUser(email: string, plainPass: string): Promise<PublicUser | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;
    const ok = await bcrypt.compare(plainPass, user.passwordHash);
    if (!ok) return null;
    const { passwordHash, ...publicUser } = user as any;
    return publicUser;
  }
}
