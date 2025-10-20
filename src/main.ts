import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './presentation/app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('Email Worker iniciado e escutando a fila...');
}

bootstrap();