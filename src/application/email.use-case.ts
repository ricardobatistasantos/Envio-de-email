import { Inject, Injectable } from '@nestjs/common';
import { EmailDTO } from './email.dto';
import { IEmailProvider } from '../core/email.provider';

@Injectable()
export class EmailService {
  constructor(
    @Inject('IEmailProvider')
    private readonly emailProvider: IEmailProvider
  ) { }

  async execute(data: EmailDTO) {
    try {
      await this.emailProvider.sendMail(
        data.to,
        data.subject,
        data.text
      );
      console.info('Sending email');
    } catch (error) {
      throw error;
    }
  }
}
