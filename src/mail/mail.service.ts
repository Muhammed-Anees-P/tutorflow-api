import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

export interface SendSessionScheduledEmailOptions {
  to: string;
  studentName: string;
  tutorName: string;
  topic: string;
  scheduledAt: Date;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error('RESEND_API_KEY is missing.');
    }

    this.resend = new Resend(apiKey);
  }

  async sendSessionScheduledEmail(
    options: SendSessionScheduledEmailOptions,
  ): Promise<void> {
    const from = process.env.MAIL_FROM || 'TutorFlow <onboarding@resend.dev>';

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
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>Session Scheduled</title>
        </head>

        <body
          style="
            margin:0;
            padding:0;
            background:#f5f7fb;
            font-family:Arial,Helvetica,sans-serif;
            color:#1f2937;
          "
        >
          <div
            style="
              max-width:600px;
              margin:40px auto;
              padding:0 16px;
            "
          >
            <div
              style="
                background:#ffffff;
                border:1px solid #e5e7eb;
                border-radius:14px;
                overflow:hidden;
              "
            >

              <!-- Header -->
              <div
                style="
                  background:#6366f1;
                  padding:28px 32px;
                  text-align:center;
                "
              >
                <img
                  src="https://res.cloudinary.com/dol2v8wcf/image/upload/v1788593705/logo_gsetlu.png"
                  alt="TutorFlow"
                  width="180"
                  style="
                    display:block;
                    width:180px;
                    max-width:100%;
                    height:auto;
                    margin:0 auto;
                    border:0;
                    outline:none;
                    text-decoration:none;
                  "
                />

                <p
                  style="
                    margin:12px 0 0;
                    color:#e0e7ff;
                    font-size:14px;
                    line-height:1.5;
                  "
                >
                  Session scheduled
                </p>
              </div>

              <!-- Content -->
              <div style="padding:32px;">

                <p
                  style="
                    margin:0 0 16px;
                    font-size:16px;
                    line-height:1.5;
                  "
                >
                  Hi ${this.escapeHtml(options.studentName)},
                </p>

                <p
                  style="
                    margin:0 0 24px;
                    line-height:1.6;
                    color:#4b5563;
                    font-size:15px;
                  "
                >
                  Your tutoring session has been successfully scheduled.
                  Here are the session details:
                </p>

                <!-- Session Details -->
                <div
                  style="
                    background:#f8fafc;
                    border:1px solid #e5e7eb;
                    border-radius:10px;
                    padding:20px;
                  "
                >
                  <p
                    style="
                      margin:0 0 12px;
                      font-size:15px;
                      line-height:1.5;
                    "
                  >
                    <strong>Topic:</strong>
                    ${this.escapeHtml(options.topic)}
                  </p>

                  <p
                    style="
                      margin:0 0 12px;
                      font-size:15px;
                      line-height:1.5;
                    "
                  >
                    <strong>Tutor:</strong>
                    ${this.escapeHtml(options.tutorName)}
                  </p>

                  <p
                    style="
                      margin:0;
                      font-size:15px;
                      line-height:1.5;
                    "
                  >
                    <strong>Date &amp; time:</strong>
                    ${this.escapeHtml(scheduledDate)}
                  </p>
                </div>

                <p
                  style="
                    margin:24px 0 0;
                    line-height:1.6;
                    color:#4b5563;
                    font-size:15px;
                  "
                >
                  Please be ready at the scheduled time.
                </p>

                <p
                  style="
                    margin:24px 0 0;
                    font-size:15px;
                    line-height:1.6;
                  "
                >
                  Regards,<br />
                  <strong>TutorFlow</strong>
                </p>

              </div>

              <!-- Footer -->
              <div
                style="
                  padding:18px 32px;
                  background:#f8fafc;
                  border-top:1px solid #e5e7eb;
                  text-align:center;
                "
              >
                <p
                  style="
                    margin:0;
                    color:#9ca3af;
                    font-size:12px;
                    line-height:1.5;
                  "
                >
                  This is an automated email from TutorFlow.
                </p>
              </div>

            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const { data, error } = await this.resend.emails.send({
        from,
        to: [options.to],
        subject,
        text,
        html,
      });

      if (error) {
        throw new Error(error.message);
      }

      this.logger.log(
        `Session scheduled email sent to ${options.to}. Resend ID: ${data?.id ?? 'unknown'}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send session scheduled email to ${options.to}.`,
        error instanceof Error ? error.message : String(error),
      );

      throw error;
    }
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
