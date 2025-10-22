import { createTransport, Transporter } from "nodemailer";
import { IEmailProvider } from "../core/email.provider";

export class NodemailerProvider implements IEmailProvider {
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

  async sendMail(to: string, subject: string, text: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.GMAIL_USER,
        to,
        subject,
        text,
      });
      console.info(`E-mail enviado para: ${to}`);
    } catch (error) {
      throw error;
    }
  }
}