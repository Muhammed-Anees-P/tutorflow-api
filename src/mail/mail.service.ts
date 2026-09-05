import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendSessionScheduledEmailOptions {
  to: string;
  studentName: string;
  tutorName: string;
  topic: string;
  scheduledAt: Date;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new Error(
        'SMTP configuration is missing. Required: SMTP_HOST, SMTP_USER, SMTP_PASS.',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully.');
    } catch (error) {
      this.logger.error(
        'SMTP connection verification failed. Emails may not be sent.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async sendSessionScheduledEmail(
    options: SendSessionScheduledEmailOptions,
  ): Promise<void> {
    const from =
      process.env.MAIL_FROM ||
      process.env.SMTP_USER ||
      'TutorFlow <no-reply@tutorflow.local>';

    const scheduledDate = this.formatDate(options.scheduledAt);

    const subject = `Session scheduled: ${options.topic}`;

    const text = [
      `Hi ${options.studentName},`,
      '',
      'Your tutoring session has been scheduled.',
      '',
      `Topic: ${options.topic}`,
      `Tutor: ${options.tutorName}`,
      `Date and time: ${scheduledDate}`,
      '',
      'Please be ready at the scheduled time.',
      '',
      'Regards,',
      'TutorFlow',
    ].join('\n');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Session Scheduled</title>
        </head>
        <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
          <div style="max-width:600px;margin:40px auto;padding:0 16px;">
            <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
              <div style="background:#6366f1;padding:28px 32px;">
                <h1 style="margin:0;color:#ffffff;font-size:24px;">
                  TutorFlow
                </h1>
                <p style="margin:8px 0 0;color:#e0e7ff;font-size:14px;">
                  Session scheduled
                </p>
              </div>

              <div style="padding:32px;">
                <p style="margin:0 0 16px;font-size:16px;">
                  Hi ${this.escapeHtml(options.studentName)},
                </p>

                <p style="margin:0 0 24px;line-height:1.6;color:#4b5563;">
                  Your tutoring session has been successfully scheduled.
                  Here are the session details:
                </p>

                <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:20px;">
                  <p style="margin:0 0 12px;">
                    <strong>Topic:</strong>
                    ${this.escapeHtml(options.topic)}
                  </p>

                  <p style="margin:0 0 12px;">
                    <strong>Tutor:</strong>
                    ${this.escapeHtml(options.tutorName)}
                  </p>

                  <p style="margin:0;">
                    <strong>Date &amp; time:</strong>
                    ${this.escapeHtml(scheduledDate)}
                  </p>
                </div>

                <p style="margin:24px 0 0;line-height:1.6;color:#4b5563;">
                  Please be ready at the scheduled time.
                </p>

                <p style="margin:24px 0 0;">
                  Regards,<br />
                  <strong>TutorFlow</strong>
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.transporter.sendMail({
      from,
      to: options.to,
      subject,
      text,
      html,
    });

    this.logger.log(
      `Session scheduled email sent to ${options.to} for "${options.topic}".`,
    );
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat(process.env.MAIL_LOCALE || 'en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: process.env.MAIL_TIMEZONE || 'Asia/Kolkata',
    }).format(date);
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
