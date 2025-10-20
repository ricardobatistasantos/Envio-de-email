import { Module } from '@nestjs/common';
import { BullMqModule } from './../infra/bull-mq.module';
import { EmailListener } from './listeners/email.listener';
import { EmailService } from './../application/email.service';

@Module({
  imports: [BullMqModule],
  providers: [EmailService, EmailListener],
})
export class AppModule {}
