import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { AdminCheckResponseDto } from './dto/admin-check-response.dto';
import { OkResponseDto } from '../common/dto/ok-response.dto';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with email/password and receive access + refresh tokens' })
  @ApiOkResponse({ description: 'Returns user, accessToken and refreshToken', type: LoginResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.auth.validateLogin(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Exchange a valid refresh token for a new token pair (rotation)' })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('refresh-token')
  @ApiOkResponse({ description: 'Returns user, accessToken and new refreshToken', type: RefreshResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  async refresh(@Req() req: any) {
    // Expect header: Authorization: Bearer <refreshToken>
    const authz = (req.headers['authorization'] || req.headers['Authorization']) as string | undefined;
    const token = authz?.startsWith('Bearer ') ? authz.substring(7) : undefined;
    return this.auth.refresh(token || '');
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user payload' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Returns { user } from JWT payload', type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async me(@Req() req: any) {
    // Payload set by JwtStrategy.validate()
    return { user: req.user };
  }

  @Get('admin-check')
  @ApiOperation({ summary: 'Check ADMIN role with RolesGuard' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: AdminCheckResponseDto })
  async adminCheck() {
    return { ok: true, message: 'Admin access granted' };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout: revoke all active refresh tokens for the current user' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'All refresh tokens revoked for this user', type: OkResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async logout(@Req() req: any) {
    const userId = req.user?.id as string | undefined;
    return this.auth.logout(userId || '');
  }
}
