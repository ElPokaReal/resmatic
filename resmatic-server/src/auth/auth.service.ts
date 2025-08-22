import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import type { Role } from '../users/user.entity';
import { RefreshTokensService } from './refresh-tokens.service';
import { randomUUID } from 'crypto';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: Role;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
    private readonly refreshTokens: RefreshTokensService,
  ) {}

  async validateLogin(dto: LoginDto) {
    const user = await this.users.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    const tokens = await this.issueTokens({ sub: user.id, email: user.email, role: user.role });
    // Persistir refresh token (hash) con expiración
    const refreshExp = this.cfg.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    const expiresAt = new Date(Date.now() + this.parseDurationToMs(refreshExp));
    await this.refreshTokens.store(user.id, tokens.refreshToken, expiresAt);
    // Optional device session policy: limit active refresh tokens per user
    const maxSessions = Number(this.cfg.get<string>('AUTH_MAX_SESSIONS') ?? '0');
    await this.refreshTokens.enforceSessionLimit(user.id, maxSessions);
    return { user, ...tokens };
  }

  async issueTokens(payload: JwtPayload) {
    const accessExp = this.cfg.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';
    const refreshExp = this.cfg.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    const accessSecret = this.cfg.get<string>('JWT_ACCESS_SECRET') || 'dev_access_secret';
    const refreshSecret = this.cfg.get<string>('JWT_REFRESH_SECRET') || 'dev_refresh_secret';

    const accessToken = await this.jwt.signAsync(payload, {
      secret: accessSecret,
      expiresIn: accessExp,
      jwtid: randomUUID(),
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: refreshExp,
      jwtid: randomUUID(),
    });
    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    const refreshSecret = this.cfg.get<string>('JWT_REFRESH_SECRET') || 'dev_refresh_secret';
    try {
      const decoded = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });
      const user = await this.users.findById(decoded.sub);
      if (!user) throw new UnauthorizedException('Usuario no encontrado');
      // Validar refresh token contra la base de datos (hash + no revocado + no expirado)
      const record = await this.refreshTokens.findValid(user.id, refreshToken);
      if (!record) throw new UnauthorizedException('Refresh token no reconocido');
      if (record.expiresAt.getTime() <= Date.now()) {
        await this.refreshTokens.revokeById(record.id);
        throw new UnauthorizedException('Refresh token expirado');
      }

      // Rotación: revocar el actual y emitir/guardar uno nuevo
      await this.refreshTokens.revokeById(record.id);
      const { passwordHash, ...publicUser } = user as any;
      const tokens = await this.issueTokens({ sub: user.id, email: user.email, role: (user as any).role });
      const refreshExp = this.cfg.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
      const expiresAt = new Date(Date.now() + this.parseDurationToMs(refreshExp));
      await this.refreshTokens.store(user.id, tokens.refreshToken, expiresAt);
      const maxSessions = Number(this.cfg.get<string>('AUTH_MAX_SESSIONS') ?? '0');
      await this.refreshTokens.enforceSessionLimit(user.id, maxSessions);
      return { user: publicUser, ...tokens };
    } catch (e) {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  async logout(userId: string) {
    await this.refreshTokens.revokeAllForUser(userId);
    return { ok: true };
  }

  private parseDurationToMs(v: string): number {
    // Soporta "15m", "7d", "1h", "30s"
    const m = /^\s*(\d+)\s*([smhd])\s*$/i.exec(v);
    if (!m) return 0;
    const n = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    const mul = unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
    return n * mul;
  }
}
