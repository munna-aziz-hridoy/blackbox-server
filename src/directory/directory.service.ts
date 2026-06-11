import { Injectable } from '@nestjs/common';
import { createHmac, randomInt, randomUUID } from 'crypto';
import { readFileSync, renameSync, writeFileSync } from 'fs';

export type Account = {
  emailHash: string;
  userId: string;
  deviceId: string;
  publicKey: string;
  verified: boolean;
  code: string | null;
  codeExpiresAt: number | null;
  createdAt: number;
  pushToken?: string | null;
};

const CODE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class DirectoryService {
  private readonly file = process.env.DIRECTORY_FILE ?? 'directory.json';
  private readonly secret = process.env.MASTER_SECRET ?? '';
  private readonly accounts = new Map<string, Account>();

  constructor() {
    try {
      const rows: Record<string, unknown>[] = JSON.parse(
        readFileSync(this.file, 'utf8'),
      );
      let migrated = false;
      for (const row of rows) {
        if (typeof row.emailHash === 'string') {
          this.accounts.set(row.emailHash, row as unknown as Account);
        } else if (typeof row.email === 'string') {
          // Legacy record: convert plaintext email → emailHash, drop email/name.
          const account: Account = {
            emailHash: this.hashEmail(row.email),
            userId: row.userId as string,
            deviceId: row.deviceId as string,
            publicKey: row.publicKey as string,
            verified: Boolean(row.verified),
            code: (row.code as string) ?? null,
            codeExpiresAt: (row.codeExpiresAt as number) ?? null,
            createdAt: row.createdAt as number,
          };
          this.accounts.set(account.emailHash, account);
          migrated = true;
        }
      }
      if (migrated) this.persist();
    } catch {
      // No directory file yet — start empty.
    }
  }

  register(email: string, publicKey: string): string {
    const emailHash = this.hashEmail(email);
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    this.accounts.set(emailHash, {
      emailHash,
      userId: randomUUID(),
      deviceId: randomUUID(),
      publicKey,
      verified: false,
      code,
      codeExpiresAt: Date.now() + CODE_TTL_MS,
      createdAt: Date.now(),
    });
    this.persist();
    return code;
  }

  verify(email: string, code: string): Account | null {
    const account = this.accounts.get(this.hashEmail(email));
    if (!account || !account.code || !account.codeExpiresAt) return null;
    if (Date.now() > account.codeExpiresAt) return null;
    if (account.code !== code) return null;

    account.verified = true;
    account.code = null;
    account.codeExpiresAt = null;
    this.persist();
    return account;
  }

  find(email: string): Account | null {
    const account = this.accounts.get(this.hashEmail(email));
    return account?.verified ? account : null;
  }

  setPushToken(userId: string, token: string): void {
    for (const account of this.accounts.values()) {
      if (account.userId === userId) {
        account.pushToken = token || null;
        this.persist();
        return;
      }
    }
  }

  getPushToken(userId: string): string | null {
    for (const account of this.accounts.values()) {
      if (account.userId === userId) return account.pushToken ?? null;
    }
    return null;
  }

  private hashEmail(email: string): string {
    return createHmac('sha256', this.secret)
      .update(email.trim().toLowerCase())
      .digest('base64url');
  }

  private persist() {
    const temp = `${this.file}.tmp`;
    writeFileSync(temp, JSON.stringify([...this.accounts.values()], null, 2));
    renameSync(temp, this.file);
  }
}
