import { exit } from 'process';
import { BullMqManager } from '../src/infra/bull-mq.manager';

(async () => {
  const queue = new BullMqManager({
    host: 'localhost',
    port: 6379,
    password: 'SuperSenhaSegura123!',
  });

  // clear & npx ts-node client.test.ts
  await queue.addJob('email-queue', 'e-mail', {
    to: 'rb0277623@gmail.com',
    subject: 'Teste de envio de email com filas BullMQ',
    text: 'text text',
  });
  console.log('Email sent successfully');
  exit(0);
})();
