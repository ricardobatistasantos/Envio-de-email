import { Inject } from '@nestjs/common';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { BullMqManager } from '@infra/bull-mq.manager';
import { EmailService } from '@application/email.use-case';
import { EmailSchema } from '@application/email.dto';

@Injectable()
export class EmailListener implements OnModuleInit {
  constructor(
    @Inject('BULL_MQ') private readonly bullMqManager: BullMqManager,
    private readonly emailService: EmailService,
  ) {}

  async onModuleInit() {
    this.bullMqManager.worker(
      'email-queue',
      async (job) => {
        const result = EmailSchema.safeParse(job.data);
        if (!result.success) {
          throw new Error(`fails validation: ${result.error.errors}`);
        }

        const { to, subject, text } = job.data;
        await this.emailService.execute({ to, subject, text });
      },
      3,
    );
  }
}
