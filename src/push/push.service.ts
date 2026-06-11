import { Injectable, Logger } from '@nestjs/common';

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  // Best-effort: a failed push must never break message/call relaying.
  async send(token: string | null, payload: PushPayload): Promise<void> {
    if (!token) return;
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          title: payload.title,
          body: payload.body,
          data: payload.data ?? {},
          sound: 'default',
          priority: 'high',
          channelId: 'default',
        }),
      });
    } catch (error) {
      this.logger.warn(`push failed: ${(error as Error).message}`);
    }
  }
}
