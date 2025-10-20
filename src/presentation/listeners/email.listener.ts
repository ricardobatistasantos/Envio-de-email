import { Injectable, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { BullMqManager } from '../../infra/bull-mq.manager';
import { EmailService } from '../../application/email.service';
import { EmailSchema } from '../../application/dto/email.dto';

@Injectable()
export class EmailListener implements OnModuleInit {
  constructor(
    @Inject('BULL_MQ') private readonly bullMqManager: BullMqManager,
    private readonly emailService: EmailService,
  ) { }

  async onModuleInit() {
    console.log('Iniciando listener de e-mails...');

    this.bullMqManager.worker('email-queue', async job => {

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

// Essas Aqui são minha estrutura de pastas dos dois projetos, um para simular um cadastro e o outro para enviar o email em background

// Dockerfile
// # Usar a versão oficial do Redis
// FROM redis:7.2

// # Copiar o arquivo de configuração personalizado
// COPY redis.conf /usr/local/etc/redis/redis.conf

// # Definir o comando de inicialização com configuração segura
// CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]

// docker-compose
// services:
//   redis:
//     build: .
//     container_name: redis_secure
//     restart: always
//     ports:
//       - "6379:6379"
//     volumes:
//       - redis_data:/data
//     environment:
//       - REDIS_PASSWORD=SuperSenhaSegura123!
//     command: ["redis-server", "/usr/local/etc/redis/redis.conf"]

// volumes:
//   redis_data:
//     driver: local

// email-worker
// ├── src/
// │   ├── application/
// |       |── email.service.ts
// │   ├── infra/
// |       |── bull-manager.manager.ts
// |       |── bull-module.module.ts
// │   ├── presentation/
// |       |── listeners/
// |           |── email.listener.ts
// |       |── app.module.ts
// │   ├── schemas/
// |       |── email.schema.ts
// └── main.ts

// user-service
// ├── src/
// │   ├── application/
// |       |── use-cases/
// |           |── create-person.use-case.ts
// │   ├── infra/
// |       |── bull-manager.manager.ts
// |       |── bull-module.module.ts
// │   ├── presentation/
// |       |── controllers/
// |           |── person.controller.ts
// |       |── dtos/
// |           |── create-person.dto.ts
// |       |── app.module.ts
// │   ├── schemas/
// |       |── email.schema.ts
// └── main.ts

// Arquivos do email-worker

// import { Injectable } from '@nestjs/common';
// import { createTransport, Transporter } from 'nodemailer';

// @Injectable()
// export class EmailService {
//   private transporter: Transporter;

//   constructor() {
//     this.transporter = createTransport({
//       host: process.env.GMAIL_HOST,
//       port: Number(process.env.GMAIL_PORT),
//       secure: false,
//       auth: {
//         user: process.env.GMAIL_USER,
//         pass: process.env.GMAIL_PASSWORD,
//       },
//     });
//   }

//   async execute(data: { to: string, subject: string, text: string }) {
//     try {
//       await this.transporter.sendMail({
//         from: process.env.GMAIL_USER,
//         to: data.to,
//         subject: data.subject,
//         text: data.text,
//       });
//       console.log(`✅ E-mail enviado para: ${data.to}`);

//     } catch (error) {
//       throw error
//     }
//   }
// }

// import { Queue, Worker, JobsOptions, QueueOptions, FlowProducer } from 'bullmq';

// type ConnectionType = {
//   host: string;
//   port: number;
//   password: string;
// };

// export class BullMqManager {

//   private readonly connection: ConnectionType;

//   private readonly flowProducer: FlowProducer;

//   constructor(connection: ConnectionType) {
//     if (!connection) {
//       throw new Error('Connection configuration must be provided');
//     }
//     this.connection = connection;
//     this.flowProducer = new FlowProducer({ connection: this.connection });
//   }

//   public createQueue(queueName: string, options?: QueueOptions): Queue {
//     if (!queueName) {
//       throw new Error('Queue name must be provided');
//     }
//     return new Queue(queueName, { ...options, connection: this.connection });
//   }

//   public async addJob(
//     queueName: string,
//     name: string,
//     data: any,
//     options?: JobsOptions,
//   ): Promise<void> {
//     const queue = this.createQueue(queueName);
//     await queue.add(name, data, options);
//   }

//   public worker(
//     queueName: string,
//     func: (job: any) => Promise<void>,
//     concurrency: number = 1,
//   ): Worker {
//     const queue = this.createQueue(queueName);
//     return new Worker(queue.name, func, {
//       connection: this.connection,
//       concurrency,
//     });
//   }
  
//   public async addFlow(
//     name: string,
//     queueName: string,
//     data: any,
//     children: {
//       name: string;
//       queueName: string;
//       data: any;
//       options?: JobsOptions;
//     }[],
//     options?: JobsOptions,
//   ): Promise<void> {
//     const flow = {
//       name,
//       queueName,
//       data,
//       options,
//       children: children.map((child) => ({
//         name: child.name,
//         queueName: child.queueName,
//         data: child.data,
//         options: child.options,
//       })),
//     };

//     await this.flowProducer.add(flow);
//   }
// }

// import { Module, Provider } from '@nestjs/common';
// import { BullMqManager } from './bull-mq.manager';

// const TOKEN = 'BULL_MQ';
// @Module({
//   providers: [
//     {
//       provide: 'BULL_CONNECTION',
//       useValue: {
//         host: process.env.REDIS_HOST || '127.0.0.1',
//         port: parseInt(process.env.REDIS_PORT || '6379', 10),
//         password: process.env.REDIS_PASSWORD
//       },
//     },
//     {
//       provide: TOKEN,
//       useFactory: (connection) => new BullMqManager(connection),
//       inject: ['BULL_CONNECTION'],
//     },
//   ],
//   exports: [TOKEN],
// })
// export class BullMqModule { }

// import { Injectable, OnModuleInit } from '@nestjs/common';
// import { Inject } from '@nestjs/common';
// import { BullMqManager } from '../../infra/bull-mq.manager';
// import { EmailService } from '../../application/email.service';
// import { EmailSchema } from '../schemas/email.schema';

// @Injectable()
// export class EmailListener implements OnModuleInit {
//   constructor(
//     @Inject('BULL_MQ') private readonly bullMqManager: BullMqManager,
//     private readonly emailService: EmailService,
//   ) { }

//   async onModuleInit() {
//     console.log('🎧 Iniciando listener de e-mails...');

//     this.bullMqManager.worker('email-queue', async job => {

//       const result = EmailSchema.safeParse(job.data);
//       if (!result.success) {
//         console.error('❌ Validação falhou:', result.error.errors);
//         return;
//       }

//       const { to, subject, text } = job.data;
//       await this.emailService.execute({ to, subject, text });
//     },
//       3, // Define a concorrência para 3 workers
//     );
//   }
// }

// import { z } from 'zod';

// export const EmailSchema = z.object({
//   to: z.string().email({ message: 'E-mail inválido' }),
//   subject: z.string().min(3, { message: 'O assunto deve ter pelo menos 3 caracteres' }),
//   text: z.string().min(5, { message: 'O corpo do e-mail deve ter pelo menos 5 caracteres' }),
// });

// export type EmailDTO = z.infer<typeof EmailSchema>;

// import { Module } from '@nestjs/common';
// import { BullMqModule } from './../infra/bull-mq.module';
// import { EmailListener } from './listeners/email.listener';
// import { EmailService } from './../application/email.service';

// @Module({
//   imports: [BullMqModule],
//   providers: [EmailService, EmailListener],
// })
// export class AppModule {}

// import 'dotenv/config';
// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './presentation/app.module';

// async function bootstrap() {
//   const app = await NestFactory.createApplicationContext(AppModule);
//   console.log('🚀 Email Worker iniciado e escutando a fila...');
// }

// bootstrap();

// Arquivos do user service

// import { Injectable, Inject } from '@nestjs/common';
// import { BullMqManager } from '../../infra/bull-mq.manager';
// import { CreatePersonDTO } from '../../presentation/dtos/create-person.dto';

// @Injectable()
// export class CreatePersonUseCase {
//   constructor(@Inject('BULL_MQ') private readonly bullMqManager: BullMqManager) {}

//   async execute(person: CreatePersonDTO) {
//     console.log(`👤 Cadastrando pessoa: ${person.name}`);

//     // Simula o cadastro (normalmente seria um banco de dados)
//     const userId = Math.floor(Math.random() * 1000); // Simula um ID gerado

//     // Envia e-mail para a fila
//     await this.bullMqManager.addJob('email-queue', 'send-email', {
//       to: person.email,
//       subject: 'Bem-vindo!',
//       text: `Olá ${person.name}, bem-vindo ao sistema!`,
//     });

//     console.log(`📩 E-mail enfileirado para ${person.email}`);

//     return { id: userId, ...person };
//   }
// }

// import { Queue, Worker, JobsOptions, QueueOptions, FlowProducer } from 'bullmq';

// type ConnectionType = {
//   host: string;
//   port: number;
//   password: string;
// };

// export class BullMqManager {

//   private readonly connection: ConnectionType;

//   private readonly flowProducer: FlowProducer;

//   constructor(connection: ConnectionType) {
//     if (!connection) {
//       throw new Error('Connection configuration must be provided');
//     }
//     this.connection = connection;
//     this.flowProducer = new FlowProducer({ connection: this.connection });
//   }

//   public createQueue(queueName: string, options?: QueueOptions): Queue {
//     if (!queueName) {
//       throw new Error('Queue name must be provided');
//     }
//     return new Queue(queueName, { ...options, connection: this.connection });
//   }

//   public async addJob(
//     queueName: string,
//     name: string,
//     data: any,
//     options?: JobsOptions,
//   ): Promise<void> {
//     const queue = this.createQueue(queueName);
//     await queue.add(name, data, options);
//   }

//   public worker(
//     queueName: string,
//     func: (job: any) => Promise<void>,
//     concurrency: number = 1,
//   ): Worker {
//     const queue = this.createQueue(queueName);
//     return new Worker(queue.name, func, {
//       connection: this.connection,
//       concurrency,
//     });
//   }
  
//   public async addFlow(
//     name: string,
//     queueName: string,
//     data: any,
//     children: {
//       name: string;
//       queueName: string;
//       data: any;
//       options?: JobsOptions;
//     }[],
//     options?: JobsOptions,
//   ): Promise<void> {
//     const flow = {
//       name,
//       queueName,
//       data,
//       options,
//       children: children.map((child) => ({
//         name: child.name,
//         queueName: child.queueName,
//         data: child.data,
//         options: child.options,
//       })),
//     };

//     await this.flowProducer.add(flow);
//   }
// }

// import { Module, Provider } from '@nestjs/common';
// import { BullMqManager } from './bull-mq.manager';

// const TOKEN = 'BULL_MQ';
// @Module({
//   providers: [
//     {
//       provide: 'BULL_CONNECTION',
//       useValue: {
//         host: process.env.REDIS_HOST || '127.0.0.1',
//         port: parseInt(process.env.REDIS_PORT || '6379', 10),
//         password: process.env.REDIS_PASSWORD
//       },
//     },
//     {
//       provide: TOKEN,
//       useFactory: (connection) => new BullMqManager(connection),
//       inject: ['BULL_CONNECTION'],
//     },
//   ],
//   exports: [TOKEN],
// })
// export class BullMqModule { }

// import { Controller, Post, Body } from '@nestjs/common';
// import { CreatePersonUseCase } from '../../application/use-cases/create-person.use-case';
// import { CreatePersonSchema, CreatePersonDTO } from '../dtos/create-person.dto';

// @Controller('persons')
// export class PersonController {
//   constructor(private readonly createPersonUseCase: CreatePersonUseCase) {}

//   @Post()
//   async create(@Body() body: CreatePersonDTO) {
//     // Validação com Zod
//     const result = CreatePersonSchema.safeParse(body);
//     if (!result.success) {
//       return { error: result.error.errors };
//     }

//     return await this.createPersonUseCase.execute(result.data);
//   }
// }

// import { z } from 'zod';

// export const CreatePersonSchema = z.object({
//   name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres' }),
//   email: z.string().email({ message: 'E-mail inválido' }),
// });

// export type CreatePersonDTO = z.infer<typeof CreatePersonSchema>;

// import { Module } from '@nestjs/common';
// import { CreatePersonUseCase } from './../application/use-cases/create-person.use-case';
// import { BullMqModule } from './../infra/bull-mq.module';
// import { PersonController } from './controllers/person.controller';

// @Module({
//   imports:[BullMqModule],
//   controllers: [PersonController],
//   providers: [CreatePersonUseCase,],
// })
// export class AppModule {}

// import 'dotenv/config';
// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './presentation/app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   app.enableCors();
//   await app.listen(3004);
//   console.log('🚀 API rodando em http://localhost:3004');
// }
// bootstrap();

// Aqui estão todos os arquivos dos projetos