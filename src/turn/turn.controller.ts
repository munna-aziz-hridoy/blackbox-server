import {
  Controller,
  Get,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { AuthService } from '../auth/auth.service';

type IceServer = { urls: string | string[]; username?: string; credential?: string };

const TTL_SECONDS = 3600;

@Controller('turn-credentials')
export class TurnController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  get(
    @Headers('authorization') authorization: string | undefined,
  ): { iceServers: IceServer[]; ttl: number } {
    const identityKey = authorization?.replace(/^Bearer /, '') ?? '';
    if (!this.authService.verifyIdentityKey(identityKey)) {
      throw new UnauthorizedException();
    }

    const stun = (process.env.STUN_URLS ?? 'stun:stun.l.google.com:19302')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);

    const iceServers: IceServer[] = stun.map((urls) => ({ urls }));

    const turnUrls = (process.env.TURN_URLS ?? '')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);
    const secret = process.env.TURN_SECRET ?? '';

    if (turnUrls.length && secret) {
      // coturn `use-auth-secret`: username = expiry timestamp, password = base64(HMAC-SHA1).
      const username = String(Math.floor(Date.now() / 1000) + TTL_SECONDS);
      const credential = createHmac('sha1', secret)
        .update(username)
        .digest('base64');
      iceServers.push({ urls: turnUrls, username, credential });
    }

    return { iceServers, ttl: TTL_SECONDS };
  }
}
