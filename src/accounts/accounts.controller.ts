import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { DirectoryService } from '../directory/directory.service';
import { EmailService } from '../email/email.service';

@Controller()
export class AccountsController {
  constructor(
    private readonly authService: AuthService,
    private readonly directory: DirectoryService,
    private readonly email: EmailService,
  ) {}

  @Post('register')
  async register(
    @Body() body: { email?: string; publicKey?: string },
  ): Promise<{ ok: true; devCode?: string }> {
    if (!body?.email || !body?.publicKey) {
      throw new BadRequestException('email and publicKey required');
    }
    const code = this.directory.register(body.email, body.publicKey);
    try {
      await this.email.sendCode(body.email, code);
    } catch {
      throw new ServiceUnavailableException(
        'Could not send the verification email. Please try again.',
      );
    }
    return this.email.isConfigured() ? { ok: true } : { ok: true, devCode: code };
  }

  @Post('verify')
  verify(@Body() body: { email?: string; code?: string }): {
    identityKey: string;
  } {
    if (!body?.email || !body?.code) {
      throw new BadRequestException('email and code required');
    }
    const account = this.directory.verify(body.email, body.code);
    if (!account) {
      throw new BadRequestException('invalid or expired code');
    }
    const identityKey = this.authService.signIdentityKey({
      userId: account.userId,
      deviceId: account.deviceId,
      createdAt: account.createdAt,
      version: 1,
      publicKey: account.publicKey,
    });
    return { identityKey };
  }

  @Post('push-token')
  setPushToken(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { token?: string },
  ): { ok: true } {
    const identityKey = authorization?.replace(/^Bearer /, '') ?? '';
    const payload = this.authService.verifyIdentityKey(identityKey);
    if (!payload) {
      throw new UnauthorizedException();
    }
    this.directory.setPushToken(payload.userId, body?.token ?? '');
    return { ok: true };
  }
}
