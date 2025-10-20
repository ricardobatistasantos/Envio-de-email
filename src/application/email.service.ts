import { Injectable } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = createTransport({
      host: process.env.GMAIL_HOST,
      port: Number(process.env.GMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
      },
    });
  }

  async execute(data: { to: string, subject: string, text: string }) {
    try {
      await this.transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: data.to,
        subject: data.subject,
        text: data.text,
      });
      console.log(`✅ E-mail enviado para: ${data.to}`);

    } catch (error) {
      throw error
    }
  }
}