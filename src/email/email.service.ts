import { Injectable, Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly user = process.env.GMAIL_USER?.trim();
  private readonly transport: Transporter | null = this.user
    ? createTransport({
        service: 'gmail',
        auth: {
          user: this.user,
          // Gmail shows app passwords with spaces; SMTP wants them removed.
          pass: process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, ''),
        },
      })
    : null;

  isConfigured(): boolean {
    return this.transport !== null;
  }

  async sendCode(email: string, code: string): Promise<void> {
    if (!this.transport) {
      this.logger.warn(`[dev] verification code for ${email}: ${code}`);
      return;
    }
    try {
      await this.transport.sendMail({
        from: `"Black Box" <${this.user}>`,
        to: email,
        subject: `${code} is your verification code`,
        text: `Your verification code is ${code}. It expires in 10 minutes.`,
        html: `<div style="font-family:sans-serif">
          <h2 style="margin:0 0 8px">Verify your email</h2>
          <p style="color:#444;margin:0 0 16px">Enter this code to finish signing in:</p>
          <div style="font-size:32px;font-weight:700;letter-spacing:6px">${code}</div>
          <p style="color:#888;font-size:13px;margin-top:16px">Expires in 10 minutes.</p>
        </div>`,
      });
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error as Error);
      throw new Error('email_send_failed');
    }
  }
}
