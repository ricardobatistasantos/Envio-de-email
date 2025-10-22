import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@presentation/app.module';

(async () => {
  await NestFactory.createApplicationContext(AppModule);
  console.info('Email Worker started and listening the queue...');
})()