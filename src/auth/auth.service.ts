import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

export type IdentityPayload = {
  userId: string;
  deviceId: string;
  createdAt: number;
  version: number;
  publicKey: string;
};

@Injectable()
export class AuthService {
  private readonly secret = process.env.MASTER_SECRET ?? '';

  signIdentityKey(payload: IdentityPayload): string {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${body}.${this.hmac(body)}`;
  }

  verifyIdentityKey(key: string): IdentityPayload | null {
    const [body, signature] = key.split('.');
    if (!body || !signature) return null;

    const expected = this.hmac(body);
    if (signature.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

    return JSON.parse(Buffer.from(body, 'base64url').toString());
  }

  private hmac(body: string): string {
    return createHmac('sha256', this.secret).update(body).digest('base64url');
  }
}
