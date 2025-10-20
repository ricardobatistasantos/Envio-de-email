import { BullMqManager } from "./../src/infra/bull-mq.manager";

(async () => {
  const queue = new BullMqManager({
    host: 'localhost',
    port: 6379,
    password: 'SuperSenhaSegura123!'
  })

  // clear & npx ts-node teste.ts
// https://myaccount.google.com/apppasswords?rapt=AEjHL4NqFe8sVayGHq1cZYEolZS5RzoD6JSxC5ebhB92-QC1zYWjhlqoGyOgVtjSN8yHUW_DzFAsk7gwDmgbU0cdmmPXwIHBjpM_en2Ol0Wzangg0AwCF_A
  await queue.addJob(
    'email-queue',
    'e-mail',
    {
      to: 'rb0277623@gmail.com',
      subject: 'Teste de envio de email com filas BullMQ',
      text: 'text text'
    }
  )
  console.log('Email enviado com sucesso')
})()