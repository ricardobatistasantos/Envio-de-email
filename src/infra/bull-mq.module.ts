import { Module } from '@nestjs/common';
import { BullMqManager } from './bull-mq.manager';

const TOKEN = 'BULL_MQ';
@Module({
  providers: [
    {
      provide: 'BULL_CONNECTION',
      useValue: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD
      },
    },
    {
      provide: TOKEN,
      useFactory: (connection) => new BullMqManager(connection),
      inject: ['BULL_CONNECTION'],
    },
  ],
  exports: [TOKEN],
})
export class BullMqModule { }