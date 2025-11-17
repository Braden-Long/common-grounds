import { Resend } from 'resend';
import { config } from '../config';
import { logger } from '../lib/logger';

const resend = new Resend(config.email.resendApiKey);

export const emailService = {
  async sendMagicLink(email: string, token: string): Promise<void> {
    const magicLink = `${config.frontendUrl}/verify/${token}`;

    try {
      // In development, log the magic link instead of sending email
      if (config.nodeEnv === 'development' && !config.email.resendApiKey) {
        logger.info(`Magic link for ${email}: ${magicLink}`);
        console.log(`\n🔗 Magic Link for ${email}:\n${magicLink}\n`);
        return;
      }

      await resend.emails.send({
        from: config.email.fromEmail,
        to: email,
        subject: 'Your Common Grounds Login Link',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2563eb; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; font-size: 14px; color: #6b7280; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to Common Grounds!</h1>
                </div>
                <div class="content">
                  <p>Hello,</p>
                  <p>Click the button below to log in to Common Grounds:</p>
                  <p style="text-align: center;">
                    <a href="${magicLink}" class="button">Log in to Common Grounds</a>
                  </p>
                  <p style="font-size: 14px; color: #6b7280;">
                    Or copy and paste this link into your browser:<br>
                    <a href="${magicLink}">${magicLink}</a>
                  </p>
                  <p style="margin-top: 30px; font-size: 14px;">
                    <strong>This link expires in 15 minutes.</strong>
                  </p>
                  <p style="font-size: 14px; color: #6b7280;">
                    If you didn't request this, you can safely ignore this email.
                  </p>
                </div>
                <div class="footer">
                  <p>Common Grounds - Find Your UVA Class Connections</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      logger.info(`Magic link sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw new Error('Failed to send magic link email');
    }
  },
};
