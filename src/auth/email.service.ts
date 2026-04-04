import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class EmailService {
  async sendOtp(email: string, otp: string, firstName: string) {
    try {
      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: {
            name: 'macbid',
            email: process.env.BREVO_SENDER_EMAIL,
          },
          to: [{ email, name: firstName }],
          subject: 'Your macbid verification code',
          htmlContent: `
            <div style="font-family: monospace; max-width: 480px; margin: 0 auto; padding: 40px 24px; background-color: #DDDDCC;">
              <h1 style="font-size: 24px; font-weight: 700; color: #323232; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">
                macbid
              </h1>
              <p style="font-size: 13px; color: #6B6B5A; margin-bottom: 32px; letter-spacing: 0.04em;">
                FASHION & CLOTHING
              </p>
              <div style="border: 1px solid #C8C8B4; padding: 28px; background-color: #E8E8D8;">
                <p style="font-size: 14px; color: #323232; margin-bottom: 8px;">
                  Hi ${firstName},
                </p>
                <p style="font-size: 13px; color: #6B6B5A; margin-bottom: 24px; line-height: 1.6;">
                  Use the verification code below to complete your registration. This code expires in <strong style="color: #323232;">10 minutes</strong>.
                </p>
                <div style="background-color: #323232; padding: 20px; text-align: center; margin-bottom: 24px;">
                  <span style="font-size: 32px; font-weight: 700; color: #DDDDCC; letter-spacing: 0.3em;">
                    ${otp}
                  </span>
                </div>
                <p style="font-size: 11px; color: #9B9B8A; line-height: 1.6;">
                  If you did not create an account with macbid, you can safely ignore this email.
                </p>
              </div>
              <p style="font-size: 11px; color: #9B9B8A; margin-top: 24px; text-align: center;">
                © macbid. All rights reserved.
              </p>
            </div>
          `,
        },
        {
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error: any) {
      console.error('Failed to send OTP email:', error?.response?.data ?? error);
      throw new InternalServerErrorException(
        'Failed to send verification email. Please try again.',
      );
    }
  }
}