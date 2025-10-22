import { Module } from '@nestjs/common';
import { BullMqModule } from '@infra/bull-mq.module';
import { EmailListener } from './email.listener';
import { EmailService } from '@application/email.use-case';
import { NodemailerProvider } from '@infra/nodemailer.provider';

@Module({
  imports: [BullMqModule],
  providers: [
    EmailListener,
    EmailService,
    {
      provide: 'IEmailProvider',
      useClass: NodemailerProvider
    }
  ],
})
export class AppModule { }
